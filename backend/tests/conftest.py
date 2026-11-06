import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.security import create_access_token, get_password_hash
from app.database.base import Base
from app.database.connection import get_db
from app.main import app
from app.models.profile import Profile

# Use in-memory SQLite database for isolated fast testing
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session():
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_user(db_session) -> Profile:
    user = Profile(
        id="admin-user-uuid",
        email="admin@realitybrandcheck.ai",
        full_name="Admin User",
        role="ADMIN",
        workspace_id="test-workspace",
        hashed_password=get_password_hash("password123"),
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def editor_user(db_session) -> Profile:
    user = Profile(
        id="editor-user-uuid",
        email="editor@realitybrandcheck.ai",
        full_name="Editor User",
        role="EDITOR",
        workspace_id="test-workspace",
        hashed_password=get_password_hash("password123"),
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def reviewer_user(db_session) -> Profile:
    user = Profile(
        id="reviewer-user-uuid",
        email="reviewer@realitybrandcheck.ai",
        full_name="Reviewer User",
        role="REVIEWER",
        workspace_id="test-workspace",
        hashed_password=get_password_hash("password123"),
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def other_workspace_user(db_session) -> Profile:
    user = Profile(
        id="other-user-uuid",
        email="other@externalcorp.com",
        full_name="External User",
        role="EDITOR",
        workspace_id="other-workspace",
        hashed_password=get_password_hash("password123"),
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def editor_token(editor_user) -> str:
    return create_access_token({
        "sub": editor_user.id,
        "email": editor_user.email,
        "role": editor_user.role,
        "workspace_id": editor_user.workspace_id,
    })


@pytest.fixture
def reviewer_token(reviewer_user) -> str:
    return create_access_token({
        "sub": reviewer_user.id,
        "email": reviewer_user.email,
        "role": reviewer_user.role,
        "workspace_id": reviewer_user.workspace_id,
    })


@pytest.fixture
def admin_token(admin_user) -> str:
    return create_access_token({
        "sub": admin_user.id,
        "email": admin_user.email,
        "role": admin_user.role,
        "workspace_id": admin_user.workspace_id,
    })


@pytest.fixture
def other_token(other_workspace_user) -> str:
    return create_access_token({
        "sub": other_workspace_user.id,
        "email": other_workspace_user.email,
        "role": other_workspace_user.role,
        "workspace_id": other_workspace_user.workspace_id,
    })

