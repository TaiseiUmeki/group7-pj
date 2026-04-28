# Application 層 — ARCHITECTURE.md

## 責務

ユースケースの実装、ドメインオブジェクトのオーケストレーション。

## 依存ルール

```
Presentation → Application → Domain ← Infrastructure
                                ↑
                               DI（結合層）
```

- **domain 層のみ import 可**
- infrastructure / presentation は import 不可
- `from app.domain.xxx` は OK
- `from app.infrastructure.xxx` は NG
- `from app.presentation.xxx` は NG

## ディレクトリ構成

```
application/{module}/
├── auth_usecase.py            # ユースケース
├── employee_usecase.py
├── company_usecase.py
├── department_usecase.py
├── role_usecase.py
└── schema/                    # Application 層 DTO
    ├── employee_schemas.py
    └── company_schemas.py
```

## データ受け渡し

### 入力（Presentation 層 → Application 層）

**生のプリミティブ型で受け取る**（DTO ではない）。

```python
def get_employees(
    self,
    token: str,
    page: int = 1,
    per_page: int = 50,
    department_id: Optional[int] = None,
    role_ids: Optional[List[int]] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    company_id: Optional[int] = None,
) -> Dict[str, Any]:
```

- ファイルは `bytes` + `str`（ファイル名）で受け取る:
  ```python
  async def update_my_company(
      self,
      token: str,
      name: Optional[str] = None,
      info_data: Optional[Dict[str, Any]] = None,
      logo_file: Optional[bytes] = None,
      logo_filename: Optional[str] = None,
  ) -> CompanyDto:
  ```

### 出力パターン

| パターン         | 返却型                                     | 用途                                          |
| ---------------- | ------------------------------------------ | --------------------------------------------- |
| 単一エンティティ | `DTO`（`EmployeeDetailDto`, `CompanyDto`） | 詳細取得。リレーション名前解決あり            |
| 一覧（推奨）     | `{Entity}ListResult` DTO                   | Entity リストを DTO に変換して返却            |
| 一覧（レガシー） | `Dict[str, Any]`                           | Repository から受け取った Dict をそのまま返却 |
| 認証             | `Dict[str, Any]`                           | トークン・ユーザー情報・権限を含む複合データ  |
| 削除             | `None`                                     | 戻り値なし                                    |

> **推奨**: 一覧取得でも Typed DTO（`{Entity}ListResult`）を返却する。
> Dict パススルーは**レガシーパターン**であり、新規実装では使用しない。
> **例外**: バルクエクスポート（10,000件以上）はストリーミング処理で Dict を直接使うのが適切。

## ユースケースパターン

### コンストラクタ DI

ドメインインターフェースをコンストラクタで注入する。

```python
class EmployeeUsecase:
    def __init__(
        self,
        token_service: TokenService,            # domain 層 ABC
        employee_repository: EmployeeRepository, # domain 層 ABC
        department_repository: DepartmentRepository,
        role_repository: RoleRepository,
        assignment_service: EmployeeAssignmentService,
    ):
        self.token_service = token_service
        self.employee_repository = employee_repository
        self.department_repository = department_repository
        self.role_repository = role_repository
        self.assignment_service = assignment_service
```

**オプショナル依存**の場合は `Optional[...]` を使用:

```python
class AuthUsecase:
    def __init__(
        self,
        token_service: TokenService,
        auth_repository: AuthRepository,
        user_permissions_usecase: Optional[UserPermissionsUsecase] = None,
        login_attempt_service: Optional[ILoginAttemptService] = None,
        audit_logger: Optional[AuditLogger] = None,
        resolve_modules_usecase: Optional[ResolveModulesUsecase] = None,
    ):
        self.token_service = token_service
        self.auth_repository = auth_repository
        self.user_permissions_usecase = user_permissions_usecase
        # ...
```

### トークン検証 → company_id 抽出

全ユースケースメソッドの共通パターン:

```python
def get_employees(self, token: str, ...) -> Dict[str, Any]:
    # 1. トークン検証
    user_info = self.token_service.verify_token(token)
    if not user_info:
        raise AuthenticationException("Invalid token")

    # 2. company_id 抽出
    company_id = user_info.get("company_id")
    if not company_id:
        raise AuthenticationException("Company ID not found in token")

    # 3. リポジトリ呼び出し
    result = self.employee_repository.get_employees(
        company_id=company_id,
        page=page,
        per_page=per_page,
    )

    # 4. 結果返却
    return result
```

### 単一エンティティ取得 → DTO 変換

リレーションの名前解決は Application 層の責務:

```python
def get_employee(self, token: str, employee_id: int) -> EmployeeDetailDto:
    user_info = self.token_service.verify_token(token)
    company_id = user_info.get("company_id")

    # Repository → Entity
    employee = self.employee_repository.get_employee_by_id(employee_id, company_id)
    if not employee:
        raise EmployeeNotFoundException(employee_id=employee_id)

    # Entity → DTO（名前解決あり）
    return self._resolve_employee_relations(employee, company_id)


def _resolve_employee_relations(
    self, employee: Employee, company_id: int
) -> EmployeeDetailDto:
    """department_ids / role_ids を名前付きデータに解決し DTO を返す"""

    # ID → 名前のマッピング
    departments_data: List[Dict[str, Any]] = []
    if employee.department_ids:
        all_departments = self.department_repository.list(company_id)
        dept_map = {d.id: d.name for d in all_departments}
        departments_data = [
            {"id": did, "name": dept_map.get(did, "")}
            for did in employee.department_ids
        ]

    roles_data: List[Dict[str, Any]] = []
    if employee.role_ids:
        all_roles = self.role_repository.list(company_id)
        role_map = {r.id: r.name for r in all_roles}
        roles_data = [
            {"id": rid, "name": role_map.get(rid, "")}
            for rid in employee.role_ids
        ]

    return EmployeeDetailDto(
        id=employee.id,
        name=employee.name,
        email=employee.email,
        company_id=employee.company_id,
        authority=authority,
        login_id=employee.login_id,
        departments=departments_data,
        roles=roles_data,
        created_at=employee.created_at,
        updated_at=employee.updated_at,
    )
```

### 一覧取得 → `{Entity}ListResult` DTO 返却（推奨）

Repository から受け取った結果を Typed DTO に変換して返す:

```python
def list_customers(
    self,
    token: str,
    page: int = 1,
    per_page: int = 20,
    sort_by: str = "seq_number",
    sort_order: str = "desc",
    status_id: Optional[int] = None,
    type_id: Optional[int] = None,
) -> CustomerListResult:
    user_info = self.token_service.verify_token(token)
    company_id = user_info.get("company_id")

    result = self.customer_repository.list_customers(
        company_id=company_id,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order,
        status_id=status_id,
        type_id=type_id,
    )

    # Dict 内の items を CustomerResult DTO に変換
    items = [CustomerResult(**item) for item in result["items"]]

    return CustomerListResult(
        items=items,
        total_count=result["total_count"],
        page=result["page"],
        per_page=result["per_page"],
        has_more=result["has_more"],
    )
```

### 一覧取得 → Dict パススルー（レガシー）

> **注意**: このパターンは既存コードとの後方互換のために残存している。
> 新規実装では上記の `{Entity}ListResult` DTO パターンを使用すること。

```python
def get_employees(self, token: str, ...) -> Dict[str, Any]:
    user_info = self.token_service.verify_token(token)
    target_company_id = company_id if company_id else user_info.get("company_id")

    result = self.employee_repository.get_employees(
        company_id=target_company_id,
        page=page,
        per_page=per_page,
    )
    return result  # {"items": [...], "page": 1, "per_page": 50, "total_count": 100, "has_more": True}
```

### 認証 → Dict 返却

トークン・ユーザー情報・権限を含む複合データ:

```python
async def login(self, identifier: str, password: str, ...) -> Dict[str, Any]:
    # ... 認証ロジック ...

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "Bearer",
        "expires_in": expires_in,
        "expires_at": expires_at.isoformat(),
        "employee": {
            "id": user_data["id"],
            "company_id": user_data["company_id"],
            "name": user_data["name"],
            "email": user_data.get("email", ""),
            "authority": user_data.get("authority"),
            "roles": user_data.get("roles", []),
            "departments": user_data.get("departments", []),
        },
        "denied_resources": denied_resources,
        "plan": plan_info,
        "modules": modules_info,
    }
```

## スキーマ/DTO

`{module}/schema/` ディレクトリに配置する。

### ルール

- Pydantic `BaseModel` + `from_attributes = True`
- 命名: `{Entity}Dto`, `{Entity}DetailDto`（単一取得用）
- 命名: `{Entity}Result`, `{Entity}ListResult`（一覧取得用）
- リレーションは名前解決済みの `List[Dict[str, Any]]` or ネスト DTO

### 参考実装 — 単一取得 DTO（`account_management/schema/employee_schemas.py`）

```python
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class EmployeeDetailDto(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    company_id: Optional[int] = None
    authority: Optional[Dict[str, Any]] = None
    login_id: Optional[str] = None
    departments: List[Dict[str, Any]] = Field(default_factory=list)
    roles: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
```

### 参考実装 — 一覧取得 DTO（`customer_management/schema/customer_schemas.py`）

**推奨パターン**: `{Entity}Result`（各アイテム）+ `{Entity}ListResult`（一覧全体）を定義する。

```python
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class CustomerResult(BaseModel):
    """一覧の各アイテム用 DTO"""
    id: int
    company_id: int
    seq_number: int
    name: str
    name_kana: Optional[str]
    customer_status_id: Optional[int]
    customer_status: Optional[Dict[str, Any]]
    customer_types: List[Dict[str, Any]]
    annual_revenue: Optional[Decimal]
    in_charge: Optional[int]
    in_charge_employee: Optional[Dict[str, Any]]
    created_by: int
    created_by_employee: Optional[Dict[str, Any]]
    customer_custom_items: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime


class CustomerListResult(BaseModel):
    """一覧全体の DTO（ページネーション情報含む）"""
    items: List[CustomerResult]
    total_count: int
    page: int
    per_page: int
    has_more: bool
```

### 参考実装 — 単一取得 DTO（`account_management/schema/company_schemas.py`）

```python
class CompanyDto(BaseModel):
    id: int
    name: str
    info: Optional[CompanyInfoDto] = None
    employee_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
```

## データフロー図

```
【書き込みパス】
Client → Presentation(Request Schema) → Application(生プリミティブ) → Infrastructure(生プリミティブ → DB Model)

【読み取りパス（単一）】
Infrastructure(Model → to_entity() → Entity) → Application(Entity → DetailDto) → Presentation(from_dto(dto) → Response) → Client

【読み取りパス（一覧）— 推奨】
Infrastructure(Model → to_entity() → List[Entity], count) → Application(List[Entity] → ListResult DTO) → Presentation(from_dto(dto) → ListResponse) → Client

【読み取りパス（一覧）— レガシー】
Infrastructure(DB Model → Dict[名前解決済み]) → Application(Dict そのまま) → Presentation(Dict → Response Schema) → Client
```

**全パスで Presentation 層は `from_dto()` のみ使用。Domain 層への直接依存なし。**
（レガシーパターンは段階的に推奨パターンへ移行する）
