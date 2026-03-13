from sqlalchemy import Column, String, Numeric
from database import Base

class Purity(Base):
    __tablename__ = "purities"

    code         = Column(String(10), primary_key=True)
    multiplier   = Column(Numeric(6, 4), nullable=False)
    display_name = Column(String(50), nullable=False)
    