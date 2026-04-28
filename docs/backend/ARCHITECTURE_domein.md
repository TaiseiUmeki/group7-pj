# Domain 層 — ARCHITECTURE.md

## 責務

ビジネスロジックの中核。外部依存なし（最内層）。

## 依存ルール

```
Presentation → Application → Domain ← Infrastructure
                                ↑
                               DI（結合層）
```

- **他の層を一切 import しない**
- Python 標準ライブラリと Pydantic のみ使用可
- `from app.domain.xxx` のみ許可（同じ domain 層内のモジュール参照）

## ディレクトリ構成

```
domain/{module}/
├── entities/           # エンティティ定義
│   └── employee.py
├── value_objects/      # 値オブジェクト定義
│   ├── email_address.py
│   ├── postal_code.py
│   └── company_info.py
├── repositories/       # リポジトリインターフェース（ABC）
│   └── employee_repository.py
├── services/           # ドメインサービス（ABC or 具体）
│   ├── token_service.py
│   └── employee_assignment_service.py
└── exceptions/         # ドメイン固有例外
    ├── exceptions.py
    └── employee_exceptions.py
```

## エンティティ

Pydantic `BaseModel` で定義する。

### ルール

- `Config` に `orm_mode = True`, `from_attributes = True` を設定
- リレーションは **ID リスト**（`department_ids: List[int]`）で保持。名前解決はしない
- ファクトリメソッド（`@classmethod`）で特殊なインスタンス生成を提供

### 参考実装（`account_management/entities/employee.py`）

```python
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class Employee(BaseModel):
    """従業員エンティティ"""

    id: int
    name: str
    email: Optional[str] = None
    company_id: Optional[int] = None
    authority_id: Optional[int] = None
    department_id: Optional[int] = None
    department_ids: List[int] = Field(default_factory=list)
    role_ids: List[int] = Field(default_factory=list)
    authority_name: Optional[str] = None
    initial_login: int = 1
    is_superuser: bool = False
    login_id: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @classmethod
    def unknown(cls, employee_id: int) -> "Employee":
        """不明な従業員を生成"""
        return cls(
            id=employee_id,
            name=f"Employee {employee_id}",
            is_active=False,
        )

    class Config:
        orm_mode = True
        from_attributes = True
```

## 値オブジェクト

Pydantic `BaseModel` + `model_config = {"frozen": True}` で不変性を保証する。

### ルール

- `value` フィールドに単一値を保持
- `@field_validator` でバリデーション・正規化
- `_pattern` クラス変数（`ClassVar`）で正規表現パターンをコンパイル済みで保持
- バリデーション時に正規化した値を返す（小文字化、フォーマット統一等）

### 参考実装（`account_management/value_objects/email_address.py`）

```python
import re
from typing import ClassVar
from pydantic import BaseModel, field_validator


class EmailAddress(BaseModel):
    """メールアドレス（最大255文字、小文字に正規化）"""

    value: str

    _pattern: ClassVar[re.Pattern[str]] = re.compile(
        r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    )

    @field_validator("value")
    @classmethod
    def validate_value(cls, v: str) -> str:
        if len(v) > 255:
            msg = "メールアドレスは255文字以内である必要があります"
            raise ValueError(msg)
        if not cls._pattern.match(v):
            msg = "メールアドレスの形式が不正です"
            raise ValueError(msg)
        return v.lower()

    model_config = {"frozen": True}
```

### 複合値オブジェクト（`account_management/value_objects/company_info.py`）

複数フィールドを持ち、各フィールドで他の値オブジェクトに委譲してバリデーションする。

```python
from typing import Optional
from pydantic import BaseModel, field_validator
from .email_address import EmailAddress
from .postal_code import PostalCode


class CompanyInfo(BaseModel):
    """会社詳細情報（Value Object）"""

    invoice_number: Optional[str] = None
    postal_code: Optional[str] = None
    address1: Optional[str] = None
    email: Optional[str] = None
    # ... 他のフィールド

    @field_validator("postal_code", mode="before")
    @classmethod
    def validate_postal_code(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v != "":
            result = PostalCode(value=v)
            return result.value  # 正規化された値を返す
        return v if v != "" else None

    @field_validator("email", mode="before")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v != "":
            result = EmailAddress(value=v)
            return result.value
        return v if v != "" else None

    model_config = {"from_attributes": True}
```

## リポジトリインターフェース

`ABC` + `@abstractmethod` で定義する。Infrastructure 層が実装する。

### ルール

- **入力**: 生のプリミティブ型（`int`, `str`, `Optional[List[int]]`）
- **出力（単一取得）**: `Optional[Entity]`（ドメインエンティティ）
- **出力（一覧取得・推奨）**: `Dict[str, Any]`（`items` に Entity リスト、`total_count` 等のページネーション情報を含む）
- **出力（一覧取得・レガシー）**: `Dict[str, Any]`（`items` が手動構築の Dict リスト、名前解決済み）
- `company_id` 必須（マルチテナント分離）

> **推奨パターン**: 一覧取得でも `items` には Entity（または Application 層 DTO に変換可能な構造体）を含める。
> Infrastructure 層で名前解決を行う Dict 構築は**レガシーパターン**として既存コードに残存するが、
> 新規実装では Application 層での DTO 変換を前提とした設計を推奨する。

### 参考実装（推奨パターン — `customer_management/repositories/customer_repository.py`）

```python
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from ..entities.customer import Customer


class CustomerRepository(ABC):
    """取引先リポジトリのインターフェース"""

    @abstractmethod
    def list_customers(
        self,
        company_id: int,
        page: int = 1,
        per_page: int = 20,
        sort_by: str = "seq_number",
        sort_order: str = "desc",
        status_id: Optional[int] = None,
        type_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        取引先一覧を取得

        Returns:
            Dict[str, Any]: items（Entity リスト）+ ページネーション情報
            Application 層で CustomerListResult DTO に変換される
        """
        pass

    @abstractmethod
    def find_by_id(self, customer_id: int, company_id: int) -> Optional[Customer]:
        """IDで取引先を取得"""
        pass

    @abstractmethod
    def save(self, customer: Customer) -> Customer:
        """取引先を保存（新規作成または更新）"""
        pass

    @abstractmethod
    def delete(self, customer_id: int, company_id: int) -> bool:
        """取引先を削除"""
        pass
```

### 参考実装（レガシーパターン — `account_management/repositories/employee_repository.py`）

> **注意**: このパターンは既存コードとの後方互換のために残存している。
> 新規実装では上記の推奨パターンを使用すること。

```python
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from ..entities.employee import Employee


class EmployeeRepository(ABC):
    """従業員リポジトリのインターフェース"""

    @abstractmethod
    def get_employees(
        self,
        company_id: int,
        page: int = 1,
        per_page: int = 50,
        department_id: Optional[int] = None,
        role_ids: Optional[List[int]] = None,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Dict[str, Any]:
        """従業員一覧を取得（レガシー: Dict パススルー）"""
        pass

    @abstractmethod
    def get_employee_by_id(self, employee_id: int, company_id: int) -> Optional[Employee]:
        """IDで従業員を取得"""
        pass

    @abstractmethod
    def create_employee(
        self,
        company_id: int,
        name: str,
        login_id: str,
        password_hash: str,
        authority_id: int,
        email: Optional[str] = None,
        department_ids: List[int] = [],
        role_ids: List[int] = [],
        is_superuser: bool = False,
    ) -> Dict[str, Any]:
        """従業員を作成"""
        pass

    @abstractmethod
    def update_employee(
        self,
        employee_id: int,
        company_id: int,
        name: Optional[str] = None,
        email: Optional[str] = None,
        department_ids: Optional[List[int]] = None,
        role_ids: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        """従業員を更新"""
        pass

    @abstractmethod
    def delete_physically(self, employee_id: int, company_id: int) -> None:
        """従業員を物理削除"""
        pass

    @abstractmethod
    def has_duplicate_login_id(
        self,
        login_id: str,
        exclude_employee_id: Optional[int] = None,
    ) -> bool:
        """全社で login_id が重複しているかを判定"""
        pass
```

## ドメインサービス

### 抽象サービス（ABC）

外部依存のあるサービスのインターフェースを定義。Infrastructure 層が実装する。

```python
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class TokenService(ABC):
    """トークンサービスのインターフェース"""

    @abstractmethod
    def create_access_token(self, data: Dict[str, Any]) -> str:
        pass

    @abstractmethod
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        pass
```

### 具体サービス

ビジネスロジックのみを含む。リポジトリはメソッド引数で受け取る。

```python
from typing import List, Optional, Tuple


class EmployeeAssignmentService:
    """部署ID/役割IDの整合性チェックと重複除去"""

    def validate_assignments(
        self,
        company_id: int,
        department_ids: Optional[List[int]],
        role_ids: Optional[List[int]],
        department_repository: DepartmentRepository,
        role_repository: RoleRepository,
    ) -> Tuple[List[int], List[int]]:
        dept_ids_clean = self._dedupe(department_ids)
        role_ids_clean = self._dedupe(role_ids)

        for dept_id in dept_ids_clean:
            if not department_repository.exists(company_id, dept_id):
                raise ValueError(f"Invalid department_id for company {company_id}: {dept_id}")

        return dept_ids_clean, role_ids_clean

    def _dedupe(self, ids: Optional[List[int]]) -> List[int]:
        if not ids:
            return []
        seen = set()
        return [x for x in ids if not (x in seen or seen.add(x))]
```

## 例外

### ルール

- ドメイン固有の構造化例外として定義
- 属性でメタ情報を保持（`employee_id`, `referenced_tables` 等）
- 基底例外クラス → 用途別例外のヒエラルキー

### 参考実装

```python
# exceptions.py — 基底例外
class AccountManagementException(Exception):
    def __init__(self, message: str = "Account management error"):
        self.message = message
        super().__init__(self.message)


class AuthenticationException(AccountManagementException):
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message)


class ValidationException(AccountManagementException):
    def __init__(self, message: str = "Validation failed"):
        super().__init__(message)


# employee_exceptions.py — エンティティ固有例外
class EmployeeNotFoundException(Exception):
    def __init__(self, employee_id: int):
        self.employee_id = employee_id
        super().__init__("Employee not found")


class EmployeeDeletionRestrictedException(Exception):
    """他のデータに参照されているため削除できない"""

    def __init__(self, employee_id: int, referenced_tables: List[str]):
        self.employee_id = employee_id
        self.referenced_tables = referenced_tables
        table_list = ", ".join(referenced_tables)
        super().__init__(f"Employee {employee_id} is referenced in: {table_list}")
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
