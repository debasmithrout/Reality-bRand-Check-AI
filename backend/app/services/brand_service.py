from typing import List, Optional
from sqlalchemy.orm import Session

from app.core.errors import ForbiddenException, NotFoundException
from app.models.brand import Brand
from app.models.profile import Profile
from app.schemas.brand import BrandCreate, BrandUpdate


class BrandService:
    @staticmethod
    def get_accessible_brand(db: Session, brand_id: str, current_user: Profile) -> Brand:
        brand = db.query(Brand).filter(Brand.id == brand_id).first()
        if not brand:
            raise NotFoundException("Brand", brand_id)
        
        # Enforce workspace isolation unless user is ADMIN
        if current_user.role != "ADMIN" and brand.workspace_id != current_user.workspace_id:
            raise ForbiddenException("You do not have access to this brand's workspace.")
            
        return brand

    @staticmethod
    def list_brands(db: Session, current_user: Profile, is_active: Optional[bool] = None) -> List[Brand]:
        query = db.query(Brand)
        if current_user.role != "ADMIN":
            query = query.filter(Brand.workspace_id == current_user.workspace_id)
            
        if is_active is not None:
            query = query.filter(Brand.is_active == is_active)
            
        return query.order_by(Brand.created_at.desc()).all()

    @staticmethod
    def create_brand(db: Session, payload: BrandCreate, current_user: Profile) -> Brand:
        brand = Brand(
            workspace_id=current_user.workspace_id,
            name=payload.name,
            description=payload.description,
            industry=payload.industry,
            website=payload.website,
            created_by=current_user.id,
            is_active=True,
        )
        db.add(brand)
        db.commit()
        db.refresh(brand)
        return brand

    @staticmethod
    def update_brand(db: Session, brand_id: str, payload: BrandUpdate, current_user: Profile) -> Brand:
        brand = BrandService.get_accessible_brand(db, brand_id, current_user)
        
        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(brand, field, value)
            
        db.commit()
        db.refresh(brand)
        return brand

    @staticmethod
    def delete_brand(db: Session, brand_id: str, current_user: Profile) -> None:
        brand = BrandService.get_accessible_brand(db, brand_id, current_user)
        
        # Only admin or brand creator can delete
        if current_user.role != "ADMIN" and brand.created_by != current_user.id:
            raise ForbiddenException("Only admins or the brand creator can delete this brand.")
            
        db.delete(brand)
        db.commit()

