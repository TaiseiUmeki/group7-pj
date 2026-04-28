# Infrastructure 層 — ARCHITECTURE.md

## 責務

ドメインインターフェースの具体実装、DB・外部サービスとの接続。

## 依存ルール

```
Presentation → Application → Domain ← Infrastructure
                                ↑
                               DI（結合層）
```

- **domain 層のインターフェースを実装する**
- application 層は import 不可
- `from app.domain.xxx` は OK（エンティティ、リポジトリ IF、例外）
- `from app.application.xxx` は NG

## ディレクトリ構成

```
infrastructure/{module}/
├── db/
│   ├── models/                    # SQLAlchemy DB モデル
│   │   ├── employee_model.py
│   │   ├── company_model.py
│   │   └── department_model.py
│   └── repositories/              # リポジトリ実装
│       ├── employee_repository_impl.py
│       ├── company_repository_impl.py
│       └── department_repository_impl.py
└── token_service_impl.py          # 外部サービス実装
```

## データ受け渡し

### 入力（Application 層 → Infrastructure 層）

**生のプリミティブ型で受け取る**（Entity や DTO ではない）。

```python
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
```

### 出力パターン

| パターン | 変換方法 | 返却型 |
|---------|---------|--------|
| 単一取得 | SQLAlchemy Model → `to_entity()` | `Optional[Entity]`（ドメインエンティティ） |
| 一覧取得（推奨） | SQLAlchemy Model → `to_entity()` → Entity リスト + count | `Dict[str, Any]`（`items` に Entity リスト） |
| 一覧取得（レガシー） | SQLAlchemy Model → 手動で Dict 構築 | `Dict[str, Any]`（名前解決済み Dict リスト） |
| 作成/更新 | 操作後に Dict 構築 | `Dict[str, Any]` |
| 認証 | SQLAlchemy Model → Dict | `Dict[str, Any]`（パスワードハッシュ含む） |

> **推奨**: 一覧取得でも `to_entity()` で Entity に変換し、名前解決は Application 層に委譲する。
> Infrastructure 層は Entity 変換に専念する（オニオンアーキテクチャの原則に合致）。
> 手動 Dict 構築は**レガシーパターン**であり、新規実装では使用しない。

## DB モデル

### ルール

- `{Entity}Model` 命名
- SQLAlchemy `declarative_base` を使用
- `to_entity()` メソッドでドメインエンティティに変換
- リレーションは `relationship()` + `joinedload` で解決
- `__table_args__ = {"extend_existing": True}` を設定

### 参考実装（`account_management/db/models/employee_model.py`）

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.domain.account_management.entities.employee import Employee


class EmployeeModel(Base):
    """従業員テーブルモデル"""

    __tablename__ = "employees"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    authority_id = Column(Integer, ForeignKey("authorities.id"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255))
    initial_login = Column(Integer, default=1, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.current_timestamp(), nullable=False)
    updated_at = Column(
        DateTime,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
        nullable=False,
    )

    # リレーション
    company = relationship("CompanyModel", back_populates="employees")
    authority = relationship("AuthorityModel", back_populates="employees")
    login_info = relationship(
        "LoginInfoModel",
        back_populates="employee",
        uselist=False,
        cascade="all, delete-orphan",
    )
    employee_departments = relationship(
        "EmployeeDepartmentModel",
        back_populates="employee",
        cascade="all, delete-orphan",
    )
    employee_roles = relationship(
        "EmployeeRoleModel",
        back_populates="employee",
        cascade="all, delete-orphan",
    )

    def to_entity(self) -> Employee:
        """ORM モデル → ドメインエンティティ変換"""
        department_ids = []
        role_ids = []
        login_id = None
        authority_name = None

        try:
            if hasattr(self, "employee_departments") and self.employee_departments:
                department_ids = [ed.department_id for ed in self.employee_departments]
        except Exception:
            pass

        try:
            if hasattr(self, "employee_roles") and self.employee_roles:
                role_ids = [er.role_id for er in self.employee_roles]
        except Exception:
            pass

        try:
            if hasattr(self, "login_info") and self.login_info:
                login_id = self.login_info.login_id
        except Exception:
            pass

        try:
            if hasattr(self, "authority") and self.authority:
                authority_name = self.authority.name
        except Exception:
            pass

        return Employee(
            id=self.id,
            name=self.name,
            email=self.email,
            company_id=self.company_id,
            authority_id=self.authority_id,
            authority_name=authority_name,
            department_ids=department_ids,
            role_ids=role_ids,
            login_id=login_id,
            initial_login=self.initial_login,
            is_superuser=self.is_superuser,
            is_active=True,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
```

### `to_entity()` にパラメータを渡すパターン

集計値など、モデル単体では持たない情報を引数で渡す:

```python
class CompanyModel(Base):
    # ...

    def to_entity(
        self,
        employee_count: int = 0,
        company_info: Optional[CompanyInfo] = None,
    ) -> Company:
        return Company(
            id=self.id,
            name=self.name,
            is_deleted=self.is_deleted,
            info=company_info,
            employee_count=employee_count,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )


class DepartmentModel(Base):
    # ...

    def to_entity(self, member_count: int = 0) -> Department:
        return Department(
            id=self.id,
            company_id=self.company_id,
            name=self.name,
            member_count=member_count,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
```

## リポジトリ実装

### ルール

- `{Entity}RepositoryImpl` 命名
- `__init__(self, db: Session)` でセッション注入
- domain 層のリポジトリ ABC を継承

### コンストラクタパターン

```python
from sqlalchemy.orm import Session
from app.domain.account_management.repositories.employee_repository import EmployeeRepository


class EmployeeRepositoryImpl(EmployeeRepository):
    """従業員リポジトリ実装"""

    def __init__(self, db: Session):
        self.db = db
```

### 単一エンティティ取得（Model → to_entity() → Entity）

```python
def get_employee_by_id(self, employee_id: int, company_id: int) -> Optional[Employee]:
    model = (
        self.db.query(EmployeeModel)
        .options(
            joinedload(EmployeeModel.login_info),
            joinedload(EmployeeModel.employee_departments).joinedload(
                EmployeeDepartmentModel.department
            ),
            joinedload(EmployeeModel.authority),
            joinedload(EmployeeModel.employee_roles).joinedload(EmployeeRoleModel.role),
        )
        .filter(
            EmployeeModel.id == employee_id,
            EmployeeModel.company_id == company_id,
        )
        .first()
    )

    if not model:
        return None

    return model.to_entity()
```

### 一覧取得（推奨: Model → to_entity() → Entity リスト + count）

```python
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
    query = (
        self.db.query(CustomerModel)
        .options(
            joinedload(CustomerModel.customer_status_rel),
            joinedload(CustomerModel.customer_type_associations)
                .joinedload(CustomerTypeAssociationModel.customer_type),
            joinedload(CustomerModel.in_charge_employee),
            joinedload(CustomerModel.created_by_employee),
        )
        .filter(CustomerModel.company_id == company_id)
    )

    if status_id:
        query = query.filter(CustomerModel.customer_status_id == status_id)

    total_count = query.count()
    offset = (page - 1) * per_page
    models = query.offset(offset).limit(per_page).all()

    # Model → to_entity() → Entity。名前解決は Application 層に委譲
    items = [m.to_entity() for m in models]

    return {
        "items": items,
        "page": page,
        "per_page": per_page,
        "total_count": total_count,
        "has_more": (page * per_page) < total_count,
    }
```

### 一覧取得（レガシー: Model → Dict 構築、名前解決済み）

> **注意**: このパターンは既存コードとの後方互換のために残存している。
> 新規実装では上記の推奨パターンを使用すること。

```python
def get_employees(
    self,
    company_id: int,
    page: int = 1,
    per_page: int = 50,
    search: Optional[str] = None,
) -> Dict[str, Any]:
    query = (
        self.db.query(EmployeeModel)
        .options(
            joinedload(EmployeeModel.login_info),
            joinedload(EmployeeModel.employee_departments).joinedload(
                EmployeeDepartmentModel.department
            ),
            joinedload(EmployeeModel.employee_roles).joinedload(EmployeeRoleModel.role),
        )
        .filter(EmployeeModel.company_id == company_id)
    )

    if search:
        query = query.filter(
            (EmployeeModel.name.ilike(f"%{search}%"))
            | (EmployeeModel.email.ilike(f"%{search}%"))
        )

    total_count = query.count()
    offset = (page - 1) * per_page
    employees = query.offset(offset).limit(per_page).all()

    items = []
    for emp in employees:
        # 名前解決: リレーションから名前を取得（レガシー: Infrastructure 層で実施）
        departments = []
        if emp.employee_departments:
            for emp_dept in emp.employee_departments:
                if emp_dept.department:
                    departments.append({
                        "id": emp_dept.department.id,
                        "name": emp_dept.department.name,
                    })

        roles = []
        for emp_role in emp.employee_roles:
            if emp_role.role:
                roles.append({
                    "id": emp_role.role.id,
                    "name": emp_role.role.name,
                })

        items.append({
            "id": emp.id,
            "company_id": emp.company_id,
            "name": emp.name,
            "email": emp.email,
            "login_id": emp.login_info.login_id if emp.login_info else "",
            "departments": departments,
            "roles": roles,
            "created_at": emp.created_at.isoformat() if emp.created_at else None,
        })

    return {
        "items": items,
        "page": page,
        "per_page": per_page,
        "total_count": total_count,
        "has_more": (page * per_page) < total_count,
    }
```

### 集計つき一覧（COUNT + GROUP BY）

```python
def list(self, company_id: int) -> List[Department]:
    rows = (
        self.db.query(
            DepartmentModel.id,
            DepartmentModel.company_id,
            DepartmentModel.name,
            DepartmentModel.created_at,
            DepartmentModel.updated_at,
            func.count(EmployeeDepartmentModel.id).label("member_count"),
        )
        .outerjoin(
            EmployeeDepartmentModel,
            DepartmentModel.id == EmployeeDepartmentModel.department_id,
        )
        .filter(DepartmentModel.company_id == company_id)
        .group_by(
            DepartmentModel.id,
            DepartmentModel.company_id,
            DepartmentModel.name,
            DepartmentModel.created_at,
            DepartmentModel.updated_at,
        )
        .order_by(DepartmentModel.id.desc())
        .all()
    )
    return [
        Department(
            id=row.id,
            company_id=row.company_id,
            name=row.name,
            member_count=row.member_count or 0,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
        for row in rows
    ]
```

## トランザクション管理

### 基本パターン

```python
# 作成: flush() で ID 取得 → commit()
model = EmployeeModel(company_id=company_id, name=name)
self.db.add(model)
self.db.flush()  # model.id が確定
self.db.refresh(model)
self.db.commit()
```

### 複数テーブル操作

```python
try:
    # 親エンティティ作成
    employee = EmployeeModel(company_id=company_id, name=name)
    self.db.add(employee)
    self.db.flush()  # employee.id 確定

    # 子エンティティ作成
    login_info = LoginInfoModel(employee_id=employee.id, login_id=login_id)
    self.db.add(login_info)

    # 多対多リレーション作成
    if department_ids:
        dept_relations = [
            EmployeeDepartmentModel(employee_id=employee.id, department_id=dept_id)
            for dept_id in department_ids
        ]
        self.db.bulk_save_objects(dept_relations)

    self.db.commit()
except Exception as e:
    self.db.rollback()
    raise
```

### 多対多の更新: Delete → Insert パターン

```python
# 既存リレーションを全削除
self.db.query(EmployeeDepartmentModel).filter(
    EmployeeDepartmentModel.employee_id == employee.id
).delete(synchronize_session=False)

# 新しいリレーションを挿入
if department_ids:
    dept_relations = [
        EmployeeDepartmentModel(employee_id=employee.id, department_id=dept_id)
        for dept_id in department_ids
    ]
    self.db.bulk_save_objects(dept_relations)

self.db.flush()
self.db.commit()
```

### エラーハンドリング

```python
try:
    # 操作
    self.db.flush()  # FK/制約エラーの早期検出
    self.db.commit()
except IntegrityError as e:
    self.db.rollback()
    raise ValueError("Invalid department_ids or role_ids for this company")
except Exception as e:
    self.db.rollback()
    raise
```

### 削除前の参照チェック

```python
def delete_physically(self, employee_id: int, company_id: int) -> None:
    employee = self.db.query(EmployeeModel).filter(...).first()
    if not employee:
        raise EmployeeNotFoundException(employee_id=employee_id)

    # 参照チェック
    referenced_tables = self.find_audit_references(employee.id)
    if referenced_tables:
        raise EmployeeDeletionRestrictedException(
            employee_id=employee.id,
            referenced_tables=referenced_tables,
        )

    # 手動カスケード削除
    self.db.query(LoginInfoModel).filter(
        LoginInfoModel.employee_id == employee.id
    ).delete()
    self.db.query(EmployeeDepartmentModel).filter(
        EmployeeDepartmentModel.employee_id == employee.id
    ).delete()

    self.db.delete(employee)
    self.db.commit()
```

## 外部サービス実装

### ルール

- ドメイン層の ABC を実装する
- ステートレスなサービスはシングルトン化（DI 層で管理）

### 例

| サービス | ドメイン IF | 実装 |
|---------|-----------|------|
| JWT RS256 トークン | `TokenService` | `TokenServiceImpl` |
| S3 ファイルストレージ | `IStorageService` | `S3StorageService` |
| CloudFront 署名URL | `ICloudFrontService` | `CloudFrontService` |
| セキュリティ監査ログ | `AuditLogger` Protocol | `SecurityAuditLogger` |

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
