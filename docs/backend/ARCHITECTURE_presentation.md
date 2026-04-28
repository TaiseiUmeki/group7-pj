# Presentation 層 — ARCHITECTURE.md

## 責務

HTTP エンドポイント定義、リクエスト/レスポンス変換。

## 依存ルール

```
Presentation → Application → Domain ← Infrastructure
                                ↑
                               DI（結合層）
```

- **application 層（ユースケース）と di 層のみ import 可**
- domain 層の例外は import 可（例外マッピング用）
- infrastructure は import 不可
- `from app.application.xxx` は OK
- `from app.di.xxx` は OK（Depends で DI ファクトリ使用）
- `from app.domain.xxx.exceptions` は OK
- `from app.infrastructure.xxx` は NG

## ディレクトリ構成

```
presentation/{module}/
├── api/                       # FastAPI ルーター
│   ├── employee_api.py
│   ├── company_api.py
│   └── auth_api.py
├── schemas/                   # リクエスト/レスポンススキーマ
│   ├── employee_schemas.py
│   ├── company_schemas.py
│   └── auth_schemas.py
└── shared/
    ├── dependencies/
    │   └── auth.py            # 認証・認可デペンデンシー
    └── file_validation.py     # ファイルバリデーション
```

## ルーターパターン

### 基本構成

```python
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/employees", tags=["Employee Management"])
security = HTTPBearer()
```

### モジュール保護付きルーター

```python
router = APIRouter(
    prefix="/projects",
    tags=["Project Management"],
    dependencies=[Depends(require_module("project_management"))],  # 全エンドポイント共通
)
```

## データ受け渡し

### 入力（HTTP → Application 層）

HTTP リクエストを Pydantic スキーマで受け取り、フィールドを**個別に抽出**して Application 層に渡す。

```python
@router.patch(
    "/{employee_id}",
    response_model=EmployeeDetailResponse,
    dependencies=[Depends(authorize("write", "employees", "employee_id"))],
)
async def update_employee(
    employee_id: int,
    body: EmployeeUpdateRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    employee_usecase: EmployeeUsecase = Depends(get_employee_usecase),
) -> EmployeeDetailResponse:
    token = credentials.credentials
    # スキーマからフィールドを個別に抽出して Application 層に渡す
    dto = employee_usecase.update_employee(
        token=token,
        employee_id=employee_id,
        name=body.name,
        email=body.email,
        department_ids=body.department_ids,
        role_ids=body.role_ids,
    )
    return EmployeeDetailResponse.from_dto(dto)
```

### ファイルアップロード

`UploadFile` → `bytes` に変換して Application 層に渡す:

```python
@router.patch("/me", response_model=CompanyMeResponse)
async def update_company_me(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    company_usecase: CompanyUsecase = Depends(get_company_usecase),
    name: Optional[str] = Form(None),
    info: Optional[str] = Form(None),          # JSON 文字列
    logo_file: Optional[UploadFile] = File(None),
):
    token = credentials.credentials

    # JSON 文字列 → Dict に変換
    info_data = None
    if info:
        info_data = json.loads(info)

    # UploadFile → bytes に変換
    logo_file_bytes = None
    logo_filename = None
    if logo_file and logo_file.filename:
        logo_file_bytes = await logo_file.read()
        logo_filename = logo_file.filename
        ensure_not_executable(
            file_name=logo_filename,
            file_bytes=logo_file_bytes,
            content_type=logo_file.content_type,
            allowed_mime_types=ALLOWED_LOGO_MIME_TYPES,
            allowed_extensions=ALLOWED_LOGO_EXTENSIONS,
        )

    dto = await company_usecase.update_my_company(
        token=token,
        name=name,
        info_data=info_data,
        logo_file=logo_file_bytes,
        logo_filename=logo_filename,
    )
    return CompanyMeResponse.from_dto(dto)
```

### 出力（Application 層 → HTTP レスポンス）

| パターン | 変換方法 |
|---------|---------|
| 単一取得（DTO） | `ResponseSchema.from_dto(dto)` |
| 一覧取得（推奨） | `ListResponse.from_dto(list_result)` — Application 層 DTO から変換 |
| 一覧取得（レガシー） | Dict をそのまま返却（FastAPI が自動シリアライズ） |
| 削除 | `status_code=204`、レスポンスボディなし |

> **推奨**: 一覧取得でも `from_dto()` で Application 層 DTO から Response に変換する。
> `from_dto()` は単一取得・一覧取得の**両方**に使用する。
> Dict をそのまま返却するのは**レガシーパターン**であり、新規実装では使用しない。
>
> **`from_domain()` vs `from_dto()` について**: Presentation 層は Domain 層を直接知らない。
> Application 層 DTO のみを受け取るため、変換メソッドは `from_dto()` に統一する。
> 既存コードの `from_domain()` は Application DTO を受け取っているにもかかわらず命名が不正確。
> 新規実装では `from_dto()` を使用すること。

## エンドポイント実装パターン

### 一覧取得 + フィルタ + ページネーション（推奨: from_dto パターン）

```python
@router.get(
    "",
    response_model=CustomerListResponse,
    dependencies=[Depends(authorize("read", "customers"))],
)
async def list_customers(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("seq_number", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order"),
    status_id: Optional[int] = Query(None, description="Filter by status ID"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    customer_usecase: CustomerUsecase = Depends(get_customer_usecase),
) -> CustomerListResponse:
    token = credentials.credentials
    result = customer_usecase.list_customers(
        token=token,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order,
        status_id=status_id,
    )
    return CustomerListResponse.from_dto(result)  # Application DTO → Response 変換
```

### 一覧取得 + フィルタ + ページネーション（レガシー: Dict パススルー）

> **注意**: このパターンは既存コードとの後方互換のために残存している。
> 新規実装では上記の `from_dto()` パターンを使用すること。

```python
@router.get(
    "",
    response_model=EmployeeListResponse,
    dependencies=[Depends(authorize("read", "employees"))],
)
async def get_employees(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=1000, description="Items per page"),
    department_id: Optional[int] = Query(None, description="Filter by department ID"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    employee_usecase: EmployeeUsecase = Depends(get_employee_usecase),
) -> Dict[str, Any]:
    token = credentials.credentials
    result = employee_usecase.get_employees(
        token=token,
        page=page,
        per_page=per_page,
        department_id=department_id,
        search=search,
    )
    return result  # Dict をそのまま返却（レガシー）
```

### 詳細取得 → DTO → Response 変換

```python
@router.get(
    "/{employee_id}",
    response_model=EmployeeDetailResponse,
    dependencies=[Depends(authorize("read", "employees", "employee_id"))],
)
async def get_employee(
    employee_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    employee_usecase: EmployeeUsecase = Depends(get_employee_usecase),
) -> EmployeeDetailResponse:
    token = credentials.credentials
    dto = employee_usecase.get_employee(token, employee_id)
    return EmployeeDetailResponse.from_dto(dto)
```

### 削除

```python
@router.delete(
    "/{department_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(authorize("delete", "departments", "department_id"))],
)
async def delete_department(
    department_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    department_usecase: DepartmentUsecase = Depends(get_department_usecase),
):
    token = credentials.credentials
    department_usecase.delete(token, department_id=department_id)
```

## 認可

### `authorize()` デコレータ

ABAC ベースの Policy Enforcement Point。`dependencies` で指定する。

```python
# リソースタイプ + アクション
dependencies=[Depends(authorize("read", "employees"))]

# リソースタイプ + アクション + パスパラメータ名（特定リソースへの認可）
dependencies=[Depends(authorize("read", "employees", "employee_id"))]

# モジュール保護 + 認可（ルーター全体 + エンドポイント個別）
router = APIRouter(
    prefix="/projects",
    dependencies=[Depends(require_module("project_management"))],
)

@router.post(
    "",
    dependencies=[Depends(authorize("create", "projects"))],
)
```

## 例外マッピング

ドメイン例外を HTTP ステータスコードにマッピングする。

### 認証例外

```python
except AuthenticationException as e:
    status_code = status.HTTP_401_UNAUTHORIZED
    if "ロック" in str(e.message):
        status_code = status.HTTP_429_TOO_MANY_REQUESTS
    raise HTTPException(status_code=status_code, detail=str(e.message))

except ValidationException as e:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=str(e.message),
    )
```

### エンティティ例外

```python
except EmployeeNotFoundException:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Employee {employee_id} not found",
    )

except EmployeeDeletionRestrictedException as e:
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=str(e),
    )
```

### 汎用パターン

```python
except ValueError as e:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=str(e),
    )
except Exception as e:
    msg = str(e).lower()
    if "not found" in msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    if "invalid token" in msg:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token")
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")
```

### マッピング一覧

| ドメイン例外 | HTTP ステータス |
|------------|---------------|
| `AuthenticationException` | `401 Unauthorized` |
| `AuthenticationException`（ロック時） | `429 Too Many Requests` |
| `ValidationException` | `400 Bad Request` |
| `*NotFoundException` | `404 Not Found` |
| `*ConflictException` / `*DeletionRestrictedException` | `409 Conflict` |
| `*ValidationException`（ドメイン固有） | `422 Unprocessable Entity` |
| `ValueError` | `400 Bad Request` |
| その他 | `500 Internal Server Error` |

## スキーマ

`{module}/schemas/` ディレクトリに配置する。

### ルール

- `Field(description="...")` で OpenAPI ドキュメント対応
- `from_dto()` クラスメソッドで DTO → Response 変換
- DateTime → ISO 文字列、Dict → ネストされた Pydantic モデル

### レスポンススキーマ — 単一取得（`from_dto()` パターン）

```python
from pydantic import BaseModel, Field
from typing import Optional, List
from app.application.account_management.schema.employee_schemas import EmployeeDetailDto


class DepartmentSchema(BaseModel):
    id: int = Field(..., description="Department ID")
    name: str = Field(..., description="Department name")


class EmployeeDetailResponse(BaseModel):
    id: int = Field(..., description="Employee ID")
    company_id: int = Field(..., description="Company ID")
    name: str = Field(..., description="Employee name")
    email: Optional[str] = Field(None, description="Employee email")
    login_id: str = Field(..., description="Login ID")
    authority: Optional[Dict[str, Any]] = Field(None, description="Authority information")
    departments: List[DepartmentSchema] = Field(default=[], description="Department information")
    roles: List[RoleSchema] = Field(default=[], description="Assigned roles")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")

    @classmethod
    def from_dto(cls, dto: EmployeeDetailDto) -> "EmployeeDetailResponse":
        """Application DTO → Response スキーマ変換"""
        return cls(
            id=dto.id,
            company_id=dto.company_id,
            name=dto.name,
            email=dto.email,
            login_id=dto.login_id or "",
            authority=dto.authority,
            departments=[DepartmentSchema(**d) for d in dto.departments],
            roles=[RoleSchema(**r) for r in dto.roles],
            created_at=dto.created_at.isoformat() if dto.created_at else None,
            updated_at=dto.updated_at.isoformat() if dto.updated_at else None,
        )

    class Config:
        from_attributes = True
```

### レスポンススキーマ — 一覧取得（`from_dto()` パターン、推奨）

一覧取得でも `from_dto()` で Application 層 DTO から変換する。

```python
from app.application.customer_management.schema.customer_schemas import (
    CustomerResult,
    CustomerListResult,
)


class CustomerListItemResponse(BaseModel):
    """一覧の各アイテム用レスポンス"""
    id: Optional[int]
    company_id: Optional[int]
    seq_number: Optional[int]
    name: Optional[str]
    name_kana: Optional[str]
    customer_status: Optional[CustomerStatusSchema]
    customer_types: List[CustomerTypeSchema]
    in_charge_name: Optional[str]
    created_by_name: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    @classmethod
    def from_dto(cls, dto: CustomerResult) -> "CustomerListItemResponse":
        """Application DTO → Response スキーマ変換"""
        return cls(
            id=dto.id,
            company_id=dto.company_id,
            seq_number=dto.seq_number,
            name=dto.name,
            name_kana=dto.name_kana,
            customer_status=CustomerStatusSchema(**dto.customer_status)
                if dto.customer_status else None,
            customer_types=[CustomerTypeSchema(**ct) for ct in dto.customer_types],
            in_charge_name=dto.in_charge_employee.get("name")
                if dto.in_charge_employee else None,
            created_by_name=dto.created_by_employee.get("name")
                if dto.created_by_employee else None,
            created_at=dto.created_at,
            updated_at=dto.updated_at,
        )


class CustomerListResponse(BaseModel):
    """一覧全体のレスポンス"""
    items: List[CustomerListItemResponse]
    total_count: int
    page: int
    per_page: int
    has_more: bool

    @classmethod
    def from_dto(cls, result: CustomerListResult) -> "CustomerListResponse":
        """Application ListResult DTO → ListResponse 変換"""
        return cls(
            items=[CustomerListItemResponse.from_dto(c) for c in result.items],
            total_count=result.total_count,
            page=result.page,
            per_page=result.per_page,
            has_more=result.has_more,
        )
```

### リクエストスキーマ

```python
class EmployeeUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, description="Employee name")
    email: Optional[str] = Field(None, description="Employee email")
    department_ids: Optional[List[int]] = Field(None, description="Department IDs")
    role_ids: Optional[List[int]] = Field(None, description="Role IDs")
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
