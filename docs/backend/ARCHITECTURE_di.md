# DI（依存性注入）層 — ARCHITECTURE.md

## 責務

依存性の解決・注入、ファクトリ関数の提供。Infrastructure 実装と Domain インターフェースを結合する。

## 依存ルール

```
Presentation → Application → Domain ← Infrastructure
                                ↑
                               DI（結合層）
```

- **全層を import 可能（唯一の例外）**
- Infrastructure 実装を生成し、Domain IF と結合して Application ユースケースに注入する
- `from app.domain.xxx` は OK
- `from app.application.xxx` は OK
- `from app.infrastructure.xxx` は OK

## ディレクトリ構成

```
di/
├── account_management.py      # Account 管理 DI
├── customer_management.py     # 顧客管理 DI
├── project_management.py      # プロジェクト管理 DI
├── item_management.py         # 品目管理 DI
├── document_management.py     # 文書管理 DI
├── module_management.py       # モジュール管理 DI
├── quotation_management.py    # 見積管理 DI
├── bom_management.py          # BOM 管理 DI
└── shared_services.py         # 共有シングルトンサービス
```

## ファクトリ関数パターン

### 基本パターン

`get_{entity}_usecase(db: Session = Depends(get_db)) -> {Entity}Usecase`

組み立て順序: **Infrastructure 実装 → Domain サービス → Application ユースケース**

### 参考実装（`account_management.py`）

```python
from fastapi import Depends
from sqlalchemy.orm import Session
from app.infrastructure.shared.session import get_db

from app.application.account_management import EmployeeUsecase
from app.infrastructure.account_management.db.repositories import (
    EmployeeRepositoryImpl,
    DepartmentRepositoryImpl,
    RoleRepositoryImpl,
)
from app.domain.account_management.services.employee_assignment_service import (
    EmployeeAssignmentService,
)
from app.infrastructure.account_management.token_service_impl import TokenServiceImpl


def get_employee_usecase(db: Session = Depends(get_db)) -> EmployeeUsecase:
    """EmployeeUsecase にインフラ依存を注入"""
    # 1. Infrastructure 実装を生成
    token_service = TokenServiceImpl()
    employee_repository = EmployeeRepositoryImpl(db)
    department_repository = DepartmentRepositoryImpl(db)
    role_repository = RoleRepositoryImpl(db)

    # 2. Domain サービスを生成
    assignment_service = EmployeeAssignmentService()

    # 3. Application ユースケースに注入
    return EmployeeUsecase(
        token_service=token_service,
        employee_repository=employee_repository,
        department_repository=department_repository,
        role_repository=role_repository,
        assignment_service=assignment_service,
    )
```

### シンプルなファクトリ（`customer_management.py`）

```python
def get_customer_usecase(db: Session = Depends(get_db)) -> CustomerUsecase:
    """CustomerUsecase にリポジトリを注入"""
    customer_repository = CustomerRepositoryImpl(db)
    return CustomerUsecase(customer_repository=customer_repository)
```

### 複雑なファクトリ（クロスドメイン + 外部サービス）

```python
def get_auth_usecase(db: Session = Depends(get_db)) -> AuthUsecase:
    """AuthUsecase に全依存を注入（クロスドメイン含む）"""
    settings = get_settings()

    # Infrastructure 実装
    token_service = TokenServiceImpl()
    auth_repository = AuthRepositoryImpl(db)

    # 同ドメインのユースケース
    user_permissions_usecase = UserPermissionsUsecase(
        policy_repository=PolicyRepositoryImpl(db)
    )

    # ドメインサービス（設定値あり）
    login_attempt_service = LoginAttemptService(
        max_attempts=settings.login_max_attempts,
        window_seconds=settings.login_window_seconds,
        lock_minutes=settings.login_lock_minutes,
    )

    # 外部サービス
    audit_logger = SecurityAuditLogger()

    # 他ドメインのユースケースを注入
    resolve_modules_usecase = ResolveModulesUsecase(
        module_repo=ModuleRepositoryImpl(db),
        company_module_repo=CompanyModuleRepositoryImpl(db),
        resolution_service=ModuleResolutionService(),
    )

    return AuthUsecase(
        token_service=token_service,
        auth_repository=auth_repository,
        user_permissions_usecase=user_permissions_usecase,
        login_attempt_service=login_attempt_service,
        audit_logger=audit_logger,
        resolve_modules_usecase=resolve_modules_usecase,
    )
```

### ネストされたユースケース依存（`item_management.py`）

```python
def get_drawing_processing_usecase(
    db: Session = Depends(get_db),
    status_service: DrawingProcessingStatusService = Depends(
        get_drawing_processing_status_service
    ),
) -> DrawingProcessingUsecase:
    """DrawingProcessingUsecase に他のユースケースを注入"""
    cloudfront_service = CloudFrontService()
    s3_service = S3StorageService()

    # 他のユースケースを先に組み立てる
    drawing_page_usecase = DrawingPageUsecase(
        drawing_page_repository=DrawingPageRepositoryImpl(db),
        drawing_file_repository=DrawingFileRepositoryImpl(db),
        cloudfront_service=cloudfront_service,
        s3_service=s3_service,
        # ... 他の依存 ...
    )

    return DrawingProcessingUsecase(
        image_processing_service=ImageProcessingService(),
        s3_repository=s3_service,
        status_service=status_service,
        drawing_page_usecase=drawing_page_usecase,  # ユースケースを注入
    )
```

## シングルトンパターン

`shared_services.py` でモジュールレベルシングルトンを管理する。
ステートレスなサービス（LLM, CAD変換等）に使用。

### 参考実装（`shared_services.py`）

```python
from typing import Optional

_download_token_service_singleton: Optional[DownloadTokenService] = None
_llm_service_singleton: Optional[ILLMService] = None
_cad_conversion_service_singleton: Optional[ICADConversionService] = None
_anomaly_detector_singleton: Optional[AnomalyDetector] = None


def get_download_token_service() -> DownloadTokenService:
    """DownloadTokenService のシングルトンインスタンスを提供"""
    global _download_token_service_singleton
    if _download_token_service_singleton is None:
        _download_token_service_singleton = DownloadTokenService()
    return _download_token_service_singleton


def get_llm_service() -> ILLMService:
    """LLM サービスのシングルトンインスタンスを提供"""
    global _llm_service_singleton
    if _llm_service_singleton is None:
        _llm_service_singleton = OpenAILLMService()
    return _llm_service_singleton


def get_cad_conversion_service() -> ICADConversionService:
    """CAD 変換サービスのシングルトンインスタンスを提供"""
    global _cad_conversion_service_singleton
    if _cad_conversion_service_singleton is None:
        _cad_conversion_service_singleton = CADConversionService()
    return _cad_conversion_service_singleton


def get_anomaly_detector() -> AnomalyDetector:
    """AnomalyDetector のシングルトンインスタンスを提供"""
    global _anomaly_detector_singleton
    if _anomaly_detector_singleton is None:
        store = RedisAnomalyStore()
        _anomaly_detector_singleton = AnomalyDetector(store=store)
    return _anomaly_detector_singleton
```

### ドメイン固有のシングルトン（`item_management.py`）

```python
_status_service_instance: Optional[DrawingProcessingStatusService] = None


def get_drawing_processing_status_service() -> DrawingProcessingStatusService:
    """DrawingProcessingStatusService のシングルトンインスタンスを提供"""
    global _status_service_instance
    if _status_service_instance is None:
        _status_service_instance = DrawingProcessingStatusService()
    return _status_service_instance
```

## クロスドメイン依存

他ドメインの usecase / service / repository も DI で注入可能。

### パターン

```python
# customer_management.py — 他ドメインのリポジトリを注入
def get_customer_delete_usecase(db: Session = Depends(get_db)) -> CustomerDeleteUsecase:
    customer_repository = CustomerRepositoryImpl(db)
    project_repository = ProjectRepositoryImpl(db)      # project_management
    item_repository = ItemRepositoryImpl(db)            # item_management
    supplier_repository = SupplierRepositoryImpl(db)    # quotation_management
    return CustomerDeleteUsecase(
        customer_repository=customer_repository,
        project_repository=project_repository,
        item_repository=item_repository,
        supplier_repository=supplier_repository,
    )
```

## Presentation 層での使用方法

DI ファクトリは FastAPI の `Depends()` で使用する:

```python
from app.di.account_management import get_employee_usecase


@router.get("/employees")
async def get_employees(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    employee_usecase: EmployeeUsecase = Depends(get_employee_usecase),
):
    token = credentials.credentials
    return employee_usecase.get_employees(token=token)
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
