"""What is playing in mariposa. See database/migration_add_now_playing.sql."""

from sqlalchemy import BigInteger, Column, DateTime, Float, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY

from app.database import Base


class NowPlaying(Base):
    __tablename__ = "now_playing"
    id = Column(SmallInteger, primary_key=True, default=1)
    state = Column(String(16), nullable=False)
    session = Column(String(64), nullable=False)
    counter = Column(BigInteger, nullable=False)
    observed_at = Column(DateTime, nullable=False)
    track_key = Column(String(64), nullable=True)
    title = Column(String(500), nullable=True)
    artists = Column(ARRAY(Text), nullable=False, default=list)
    album = Column(String(500), nullable=True)
    duration_s = Column(Float, nullable=True)
    gradient = Column(ARRAY(Text), nullable=True)
    position_s = Column(Float, nullable=False, default=0)
    position_at = Column(DateTime, nullable=False)
    last_heartbeat_at = Column(DateTime, nullable=False)
    version = Column(BigInteger, nullable=False, default=0)


class RecentPlay(Base):
    __tablename__ = "recent_plays"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    track_key = Column(String(64), nullable=False)
    title = Column(String(500), nullable=False)
    artists = Column(ARRAY(Text), nullable=False, default=list)
    album = Column(String(500), nullable=True)
    gradient = Column(ARRAY(Text), nullable=True)
    played_at = Column(DateTime, nullable=False)


class PresenceArtwork(Base):
    __tablename__ = "presence_artwork"
    track_key = Column(String(64), primary_key=True)
    art_rev = Column(String(64), nullable=False)
    url = Column(Text, nullable=False)
    updated_at = Column(DateTime, nullable=False, default=func.now())
