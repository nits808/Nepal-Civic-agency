-- Nepal Civic Intelligence Graph 3.0 — Database Schema
-- PostGIS-enabled PostgreSQL

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ══════════════════════════════════════════════════
-- ENUM TYPES
-- ══════════════════════════════════════════════════

CREATE TYPE location_type AS ENUM ('country', 'province', 'district', 'municipality', 'ward');
CREATE TYPE event_category AS ENUM (
  'health', 'economy', 'politics', 'education', 'infrastructure',
  'disaster', 'agriculture', 'environment', 'law', 'technology',
  'social', 'defense', 'tourism', 'sports', 'culture'
);
CREATE TYPE source_type AS ENUM ('government', 'ngo', 'media', 'social', 'academic');
CREATE TYPE policy_status AS ENUM ('announced', 'in_committee', 'approved', 'implementing', 'completed', 'rejected');
CREATE TYPE alert_type AS ENUM ('disaster', 'policy', 'news', 'health', 'economic');
CREATE TYPE credibility_level AS ENUM ('verified', 'needs_review', 'misleading');

-- ══════════════════════════════════════════════════
-- LOCATIONS (Nepal Administrative Boundaries)
-- ══════════════════════════════════════════════════

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  name_ne VARCHAR(255),
  type location_type NOT NULL,
  parent_id UUID REFERENCES locations(id),
  code VARCHAR(50) UNIQUE,
  geom GEOMETRY(MultiPolygon, 4326),
  centroid GEOMETRY(Point, 4326),
  population INTEGER,
  area_sq_km FLOAT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_locations_geom ON locations USING GIST(geom);
CREATE INDEX idx_locations_centroid ON locations USING GIST(centroid);
CREATE INDEX idx_locations_type ON locations(type);
CREATE INDEX idx_locations_parent ON locations(parent_id);
CREATE INDEX idx_locations_name_trgm ON locations USING gin(name gin_trgm_ops);

-- ══════════════════════════════════════════════════
-- DATA SOURCES
-- ══════════════════════════════════════════════════

CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  url VARCHAR(1024) NOT NULL,
  source_type source_type NOT NULL,
  credibility_score FLOAT DEFAULT 0.5 CHECK (credibility_score >= 0 AND credibility_score <= 1),
  scrape_config JSONB DEFAULT '{}',
  schedule_cron VARCHAR(100) DEFAULT '*/15 * * * *',
  is_active BOOLEAN DEFAULT true,
  last_scraped_at TIMESTAMPTZ,
  total_articles INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sources_type ON sources(source_type);
CREATE INDEX idx_sources_active ON sources(is_active);

-- ══════════════════════════════════════════════════
-- DOCUMENTS (Raw Ingested Content)
-- ══════════════════════════════════════════════════

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES sources(id),
  title VARCHAR(1024),
  title_ne VARCHAR(1024),
  url VARCHAR(2048) UNIQUE,
  content TEXT,
  content_ne TEXT,
  content_hash VARCHAR(64) NOT NULL,
  language VARCHAR(10) DEFAULT 'en',
  published_at TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- AI-enriched fields
  category event_category,
  categories event_category[] DEFAULT '{}',
  summary_3line TEXT,
  key_decisions TEXT[],
  impact_analysis TEXT,
  sentiment_score FLOAT,
  credibility_score FLOAT,
  credibility_level credibility_level,
  
  -- Dedup
  cluster_id UUID,
  is_canonical BOOLEAN DEFAULT true,
  
  -- Status
  processing_status VARCHAR(50) DEFAULT 'ingested',
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_source ON documents(source_id);
CREATE INDEX idx_documents_hash ON documents(content_hash);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_published ON documents(published_at DESC);
CREATE INDEX idx_documents_status ON documents(processing_status);
CREATE INDEX idx_documents_cluster ON documents(cluster_id);
CREATE INDEX idx_documents_credibility ON documents(credibility_level);

-- ══════════════════════════════════════════════════
-- EVENT LOCATIONS (Geo-tagged Events)
-- ══════════════════════════════════════════════════

CREATE TABLE event_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id),
  coordinates GEOMETRY(Point, 4326),
  confidence FLOAT DEFAULT 1.0,
  geo_source VARCHAR(50) DEFAULT 'ai_extraction',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_event_locations_doc ON event_locations(document_id);
CREATE INDEX idx_event_locations_loc ON event_locations(location_id);
CREATE INDEX idx_event_locations_coords ON event_locations USING GIST(coordinates);

-- ══════════════════════════════════════════════════
-- POLICIES
-- ══════════════════════════════════════════════════

CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(1024) NOT NULL,
  title_ne VARCHAR(1024),
  description TEXT,
  ministry VARCHAR(255),
  status policy_status DEFAULT 'announced',
  announced_date DATE,
  approved_date DATE,
  implementation_start DATE,
  completion_date DATE,
  progress_pct FLOAT DEFAULT 0,
  budget_allocated BIGINT DEFAULT 0,
  budget_spent BIGINT DEFAULT 0,
  responsible_officials UUID[] DEFAULT '{}',
  affected_locations UUID[] DEFAULT '{}',
  document_ids UUID[] DEFAULT '{}',
  outcomes TEXT[],
  timeline JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_ministry ON policies(ministry);
CREATE INDEX idx_policies_announced ON policies(announced_date DESC);

-- ══════════════════════════════════════════════════
-- OFFICIALS
-- ══════════════════════════════════════════════════

CREATE TABLE officials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  name_ne VARCHAR(255),
  role VARCHAR(255),
  party VARCHAR(255),
  ministry VARCHAR(255),
  province VARCHAR(255),
  district VARCHAR(255),
  photo_url VARCHAR(1024),
  
  -- Accountability Score Components
  policy_execution_rate FLOAT DEFAULT 0,
  avg_response_time_days FLOAT DEFAULT 0,
  complaint_resolution_rate FLOAT DEFAULT 0,
  budget_utilization_score FLOAT DEFAULT 0,
  public_sentiment_score FLOAT DEFAULT 0,
  accountability_score FLOAT DEFAULT 0,
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_officials_score ON officials(accountability_score DESC);
CREATE INDEX idx_officials_name_trgm ON officials USING gin(name gin_trgm_ops);

-- ══════════════════════════════════════════════════
-- USER PREFERENCES (for alerts)
-- ══════════════════════════════════════════════════

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'viewer',
  province VARCHAR(255),
  district VARCHAR(255),
  alert_preferences JSONB DEFAULT '{
    "channels": ["websocket"],
    "categories": ["disaster", "policy"],
    "locations": []
  }',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════
-- ALERTS
-- ══════════════════════════════════════════════════

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type alert_type NOT NULL,
  title VARCHAR(1024) NOT NULL,
  message TEXT,
  severity VARCHAR(20) DEFAULT 'info',
  document_id UUID REFERENCES documents(id),
  location_id UUID REFERENCES locations(id),
  coordinates GEOMETRY(Point, 4326),
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_type ON alerts(type);
CREATE INDEX idx_alerts_active ON alerts(is_active);
CREATE INDEX idx_alerts_coords ON alerts USING GIST(coordinates);

-- ══════════════════════════════════════════════════
-- PREDICTIONS
-- ══════════════════════════════════════════════════

CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL, -- disaster, economic, health
  title VARCHAR(1024),
  description TEXT,
  location_id UUID REFERENCES locations(id),
  probability FLOAT CHECK (probability >= 0 AND probability <= 1),
  severity VARCHAR(20),
  predicted_date DATE,
  model_version VARCHAR(50),
  features JSONB DEFAULT '{}',
  actual_outcome TEXT,
  was_accurate BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_predictions_type ON predictions(type);
CREATE INDEX idx_predictions_location ON predictions(location_id);

-- ══════════════════════════════════════════════════
-- SEED DATA: Nepal Administrative Locations
-- ══════════════════════════════════════════════════

-- 7 Provinces
INSERT INTO locations (name, name_ne, type, code, centroid) VALUES
  ('Nepal', 'नेपाल', 'country', 'NP', ST_SetSRID(ST_MakePoint(84.1240, 28.3949), 4326)),
  ('Province 1', 'प्रदेश नं. १', 'province', 'NP-1', ST_SetSRID(ST_MakePoint(87.2718, 26.9423), 4326)),
  ('Madhesh Province', 'मधेश प्रदेश', 'province', 'NP-2', ST_SetSRID(ST_MakePoint(85.9266, 26.7271), 4326)),
  ('Bagmati Province', 'बागमती प्रदेश', 'province', 'NP-3', ST_SetSRID(ST_MakePoint(85.3240, 27.7172), 4326)),
  ('Gandaki Province', 'गण्डकी प्रदेश', 'province', 'NP-4', ST_SetSRID(ST_MakePoint(83.9856, 28.2096), 4326)),
  ('Lumbini Province', 'लुम्बिनी प्रदेश', 'province', 'NP-5', ST_SetSRID(ST_MakePoint(83.2832, 27.6877), 4326)),
  ('Karnali Province', 'कर्णाली प्रदेश', 'province', 'NP-6', ST_SetSRID(ST_MakePoint(81.6324, 29.3862), 4326)),
  ('Sudurpashchim Province', 'सुदूरपश्चिम प्रदेश', 'province', 'NP-7', ST_SetSRID(ST_MakePoint(80.7718, 29.2986), 4326));

-- Set parent_id for provinces
UPDATE locations SET parent_id = (SELECT id FROM locations WHERE code = 'NP') WHERE type = 'province';

-- Key Districts (sample - major ones)
INSERT INTO locations (name, name_ne, type, code, parent_id, centroid) VALUES
  ('Kathmandu', 'काठमाडौं', 'district', 'NP-3-KTM', (SELECT id FROM locations WHERE code = 'NP-3'), ST_SetSRID(ST_MakePoint(85.3240, 27.7172), 4326)),
  ('Lalitpur', 'ललितपुर', 'district', 'NP-3-LAL', (SELECT id FROM locations WHERE code = 'NP-3'), ST_SetSRID(ST_MakePoint(85.3260, 27.6588), 4326)),
  ('Bhaktapur', 'भक्तपुर', 'district', 'NP-3-BKT', (SELECT id FROM locations WHERE code = 'NP-3'), ST_SetSRID(ST_MakePoint(85.4298, 27.6710), 4326)),
  ('Pokhara', 'पोखरा', 'district', 'NP-4-PKR', (SELECT id FROM locations WHERE code = 'NP-4'), ST_SetSRID(ST_MakePoint(83.9856, 28.2096), 4326)),
  ('Chitwan', 'चितवन', 'district', 'NP-3-CHT', (SELECT id FROM locations WHERE code = 'NP-3'), ST_SetSRID(ST_MakePoint(84.3542, 27.5291), 4326)),
  ('Morang', 'मोरङ', 'district', 'NP-1-MRG', (SELECT id FROM locations WHERE code = 'NP-1'), ST_SetSRID(ST_MakePoint(87.4700, 26.6600), 4326)),
  ('Sunsari', 'सुनसरी', 'district', 'NP-1-SUN', (SELECT id FROM locations WHERE code = 'NP-1'), ST_SetSRID(ST_MakePoint(87.1400, 26.6300), 4326)),
  ('Rupandehi', 'रुपन्देही', 'district', 'NP-5-RUP', (SELECT id FROM locations WHERE code = 'NP-5'), ST_SetSRID(ST_MakePoint(83.4300, 27.5100), 4326)),
  ('Jhapa', 'झापा', 'district', 'NP-1-JHP', (SELECT id FROM locations WHERE code = 'NP-1'), ST_SetSRID(ST_MakePoint(87.8800, 26.5400), 4326)),
  ('Kaski', 'कास्की', 'district', 'NP-4-KSK', (SELECT id FROM locations WHERE code = 'NP-4'), ST_SetSRID(ST_MakePoint(83.9700, 28.2200), 4326));

-- Sample Sources
INSERT INTO sources (name, url, source_type, credibility_score, schedule_cron) VALUES
  ('Nepal Government Portal', 'https://nepal.gov.np', 'government', 0.95, '*/5 * * * *'),
  ('Ministry of Finance', 'https://mof.gov.np', 'government', 0.95, '*/10 * * * *'),
  ('Ministry of Health', 'https://mohp.gov.np', 'government', 0.90, '*/10 * * * *'),
  ('Department of Roads', 'https://dor.gov.np', 'government', 0.85, '*/30 * * * *'),
  ('PPMO', 'https://ppmo.gov.np', 'government', 0.90, '*/15 * * * *'),
  ('The Kathmandu Post', 'https://kathmandupost.com', 'media', 0.80, '*/10 * * * *'),
  ('Republica', 'https://myrepublica.nagariknetwork.com', 'media', 0.78, '*/10 * * * *'),
  ('Kantipur Daily', 'https://ekantipur.com', 'media', 0.75, '*/10 * * * *'),
  ('Himalayan Times', 'https://thehimalayantimes.com', 'media', 0.77, '*/10 * * * *'),
  ('Online Khabar', 'https://english.onlinekhabar.com', 'media', 0.72, '*/10 * * * *'),
  ('Nepal Red Cross', 'https://nrcs.org', 'ngo', 0.85, '*/30 * * * *'),
  ('UN Nepal', 'https://un.org.np', 'ngo', 0.92, '*/30 * * * *');

COMMENT ON TABLE locations IS 'Nepal administrative boundaries with PostGIS geometry';
COMMENT ON TABLE documents IS 'All ingested documents from 1000+ sources';
COMMENT ON TABLE policies IS 'Government policies with lifecycle tracking';
COMMENT ON TABLE officials IS 'Government officials with accountability scoring';
