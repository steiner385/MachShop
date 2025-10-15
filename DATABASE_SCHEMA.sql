-- Manufacturing Execution System Database Schema
-- PostgreSQL 15+ Compatible
-- Jet Engine Component Manufacturing

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- SECURITY AND AUDIT SCHEMA
-- =====================================================

-- Users and Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    employee_id VARCHAR(50) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roles and Permissions
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);

-- Audit Trail
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- CREATE, UPDATE, DELETE, VIEW
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MASTER DATA SCHEMA
-- =====================================================

-- Manufacturing Sites
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state_province VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parts Master
CREATE TABLE parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_number VARCHAR(100) UNIQUE NOT NULL,
    part_name VARCHAR(255) NOT NULL,
    description TEXT,
    part_type VARCHAR(50) NOT NULL, -- RAW_MATERIAL, COMPONENT, ASSEMBLY, FINISHED_GOOD
    uom VARCHAR(20) NOT NULL, -- Unit of Measure
    weight_kg DECIMAL(10,4),
    material_specification TEXT,
    drawing_number VARCHAR(100),
    revision VARCHAR(10),
    is_serialized BOOLEAN DEFAULT false,
    is_lot_controlled BOOLEAN DEFAULT false,
    shelf_life_days INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bill of Materials
CREATE TABLE bom_headers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_part_id UUID REFERENCES parts(id) NOT NULL,
    bom_number VARCHAR(100) UNIQUE NOT NULL,
    revision VARCHAR(10) NOT NULL,
    effective_date DATE NOT NULL,
    obsolete_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bom_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bom_header_id UUID REFERENCES bom_headers(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    component_part_id UUID REFERENCES parts(id) NOT NULL,
    quantity_per DECIMAL(12,6) NOT NULL,
    scrap_factor DECIMAL(5,4) DEFAULT 0,
    is_optional BOOLEAN DEFAULT false,
    reference_designator VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (bom_header_id, line_number)
);

-- Manufacturing Routes
CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_number VARCHAR(100) UNIQUE NOT NULL,
    part_id UUID REFERENCES parts(id) NOT NULL,
    revision VARCHAR(10) NOT NULL,
    description TEXT,
    effective_date DATE NOT NULL,
    obsolete_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE route_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
    operation_number INTEGER NOT NULL,
    operation_code VARCHAR(50) NOT NULL,
    operation_name VARCHAR(255) NOT NULL,
    description TEXT,
    work_center_id UUID, -- References work_centers(id)
    setup_time_minutes INTEGER DEFAULT 0,
    cycle_time_minutes DECIMAL(8,2) NOT NULL,
    batch_size INTEGER DEFAULT 1,
    is_quality_operation BOOLEAN DEFAULT false,
    instructions TEXT,
    safety_requirements TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (route_id, operation_number)
);

-- Work Centers and Equipment
CREATE TABLE work_centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_center_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    site_id UUID REFERENCES sites(id) NOT NULL,
    department VARCHAR(100),
    capacity_per_hour DECIMAL(8,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    work_center_id UUID REFERENCES work_centers(id),
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    installation_date DATE,
    warranty_expiry_date DATE,
    status VARCHAR(20) DEFAULT 'AVAILABLE', -- AVAILABLE, BUSY, MAINTENANCE, DOWN
    last_maintenance_date DATE,
    next_maintenance_due DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- WORK ORDER MANAGEMENT SCHEMA
-- =====================================================

-- Work Orders
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_number VARCHAR(50) UNIQUE NOT NULL,
    part_id UUID REFERENCES parts(id) NOT NULL,
    route_id UUID REFERENCES routes(id) NOT NULL,
    quantity_ordered INTEGER NOT NULL,
    quantity_completed INTEGER DEFAULT 0,
    quantity_scrapped INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'CREATED', -- CREATED, RELEASED, IN_PROGRESS, COMPLETED, CANCELLED
    priority VARCHAR(10) DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, URGENT
    customer_order VARCHAR(100),
    due_date DATE,
    scheduled_start_date DATE,
    actual_start_date DATE,
    scheduled_end_date DATE,
    actual_end_date DATE,
    site_id UUID REFERENCES sites(id) NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work Order Operations
CREATE TABLE work_order_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    route_operation_id UUID REFERENCES route_operations(id) NOT NULL,
    operation_number INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, SKIPPED
    quantity_completed INTEGER DEFAULT 0,
    quantity_scrapped INTEGER DEFAULT 0,
    setup_start_time TIMESTAMPTZ,
    setup_end_time TIMESTAMPTZ,
    run_start_time TIMESTAMPTZ,
    run_end_time TIMESTAMPTZ,
    operator_id UUID REFERENCES users(id),
    work_center_id UUID REFERENCES work_centers(id),
    equipment_id UUID REFERENCES equipment(id),
    actual_cycle_time_minutes DECIMAL(8,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (work_order_id, operation_number)
);

-- Work Order Material Allocation
CREATE TABLE work_order_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    part_id UUID REFERENCES parts(id) NOT NULL,
    quantity_required DECIMAL(12,6) NOT NULL,
    quantity_allocated DECIMAL(12,6) DEFAULT 0,
    quantity_consumed DECIMAL(12,6) DEFAULT 0,
    lot_number VARCHAR(100),
    serial_number VARCHAR(100),
    expiry_date DATE,
    allocated_at TIMESTAMPTZ,
    consumed_at TIMESTAMPTZ,
    consumed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- QUALITY MANAGEMENT SCHEMA
-- =====================================================

-- Quality Plans
CREATE TABLE quality_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_number VARCHAR(100) UNIQUE NOT NULL,
    part_id UUID REFERENCES parts(id) NOT NULL,
    operation_id UUID REFERENCES route_operations(id),
    revision VARCHAR(10) NOT NULL,
    description TEXT,
    sampling_plan VARCHAR(100),
    effective_date DATE NOT NULL,
    obsolete_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality Characteristics
CREATE TABLE quality_characteristics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quality_plan_id UUID REFERENCES quality_plans(id) ON DELETE CASCADE,
    characteristic_number INTEGER NOT NULL,
    characteristic_name VARCHAR(255) NOT NULL,
    characteristic_type VARCHAR(20) NOT NULL, -- DIMENSIONAL, VISUAL, ATTRIBUTE, VARIABLE
    specification_nominal DECIMAL(12,6),
    specification_lower_limit DECIMAL(12,6),
    specification_upper_limit DECIMAL(12,6),
    uom VARCHAR(20),
    measurement_method VARCHAR(255),
    required_equipment VARCHAR(255),
    is_critical BOOLEAN DEFAULT false,
    control_chart_type VARCHAR(20), -- XBAR_R, X_MR, P, NP, C, U
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (quality_plan_id, characteristic_number)
);

-- Inspections
CREATE TABLE inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_number VARCHAR(100) UNIQUE NOT NULL,
    work_order_operation_id UUID REFERENCES work_order_operations(id) NOT NULL,
    quality_plan_id UUID REFERENCES quality_plans(id) NOT NULL,
    lot_number VARCHAR(100),
    serial_number VARCHAR(100),
    sample_size INTEGER NOT NULL,
    inspector_id UUID REFERENCES users(id) NOT NULL,
    inspection_date TIMESTAMPTZ NOT NULL,
    overall_result VARCHAR(10) NOT NULL, -- PASS, FAIL, CONDITIONAL
    notes TEXT,
    certificate_required BOOLEAN DEFAULT false,
    certificate_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inspection Results
CREATE TABLE inspection_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE,
    quality_characteristic_id UUID REFERENCES quality_characteristics(id) NOT NULL,
    sample_number INTEGER NOT NULL,
    measured_value DECIMAL(12,6),
    attribute_value VARCHAR(100),
    result VARCHAR(10) NOT NULL, -- PASS, FAIL, NA
    out_of_spec_reason VARCHAR(255),
    measurement_equipment VARCHAR(100),
    measured_at TIMESTAMPTZ NOT NULL,
    measured_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Non-Conformance Reports
CREATE TABLE non_conformance_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ncr_number VARCHAR(100) UNIQUE NOT NULL,
    inspection_id UUID REFERENCES inspections(id),
    work_order_id UUID REFERENCES work_orders(id),
    part_id UUID REFERENCES parts(id) NOT NULL,
    description TEXT NOT NULL,
    quantity_affected INTEGER NOT NULL,
    severity VARCHAR(10) NOT NULL, -- MINOR, MAJOR, CRITICAL
    status VARCHAR(20) DEFAULT 'OPEN', -- OPEN, UNDER_REVIEW, DISPOSITION_SET, CLOSED
    disposition VARCHAR(20), -- REWORK, REPAIR, SCRAP, USE_AS_IS, RETURN_TO_SUPPLIER
    disposition_reason TEXT,
    root_cause TEXT,
    corrective_action TEXT,
    reported_by UUID REFERENCES users(id) NOT NULL,
    reported_date TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by UUID REFERENCES users(id),
    reviewed_date TIMESTAMPTZ,
    closed_by UUID REFERENCES users(id),
    closed_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INVENTORY AND MATERIAL MANAGEMENT SCHEMA
-- =====================================================

-- Suppliers
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state_province VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    supplier_type VARCHAR(50), -- RAW_MATERIAL, COMPONENT, SERVICE
    quality_rating VARCHAR(10), -- A, B, C, D
    is_approved BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Locations
CREATE TABLE inventory_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    location_type VARCHAR(50) NOT NULL, -- WAREHOUSE, PRODUCTION, QUARANTINE, SCRAP
    site_id UUID REFERENCES sites(id) NOT NULL,
    aisle VARCHAR(10),
    rack VARCHAR(10),
    shelf VARCHAR(10),
    bin VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Material Lots/Batches
CREATE TABLE material_lots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lot_number VARCHAR(100) UNIQUE NOT NULL,
    part_id UUID REFERENCES parts(id) NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    received_date DATE NOT NULL,
    expiry_date DATE,
    certificate_number VARCHAR(100),
    heat_number VARCHAR(100),
    purchase_order VARCHAR(100),
    receiving_inspection_id UUID, -- References inspections(id)
    status VARCHAR(20) DEFAULT 'AVAILABLE', -- AVAILABLE, QUARANTINE, CONSUMED, EXPIRED
    quantity_received DECIMAL(12,6) NOT NULL,
    quantity_available DECIMAL(12,6) NOT NULL,
    uom VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Serial Number Tracking
CREATE TABLE serial_numbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    part_id UUID REFERENCES parts(id) NOT NULL,
    work_order_id UUID REFERENCES work_orders(id),
    material_lot_id UUID REFERENCES material_lots(id),
    parent_serial_id UUID REFERENCES serial_numbers(id),
    status VARCHAR(20) DEFAULT 'IN_PROCESS', -- IN_PROCESS, COMPLETED, SHIPPED, SCRAPPED
    manufactured_date DATE,
    location_id UUID REFERENCES inventory_locations(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Transactions
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_type VARCHAR(20) NOT NULL, -- RECEIPT, ISSUE, TRANSFER, ADJUSTMENT, SCRAP
    part_id UUID REFERENCES parts(id) NOT NULL,
    lot_number VARCHAR(100),
    serial_number VARCHAR(100),
    quantity DECIMAL(12,6) NOT NULL,
    uom VARCHAR(20) NOT NULL,
    from_location_id UUID REFERENCES inventory_locations(id),
    to_location_id UUID REFERENCES inventory_locations(id),
    work_order_id UUID REFERENCES work_orders(id),
    reason_code VARCHAR(50),
    reference_document VARCHAR(100),
    performed_by UUID REFERENCES users(id) NOT NULL,
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MAINTENANCE MANAGEMENT SCHEMA
-- =====================================================

-- Maintenance Types
CREATE TABLE maintenance_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_preventive BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance Plans
CREATE TABLE maintenance_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_number VARCHAR(100) UNIQUE NOT NULL,
    equipment_id UUID REFERENCES equipment(id) NOT NULL,
    maintenance_type_id UUID REFERENCES maintenance_types(id) NOT NULL,
    frequency_days INTEGER,
    frequency_hours INTEGER,
    frequency_cycles INTEGER,
    estimated_duration_hours DECIMAL(6,2),
    required_skills TEXT,
    safety_requirements TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance Orders
CREATE TABLE maintenance_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(100) UNIQUE NOT NULL,
    equipment_id UUID REFERENCES equipment(id) NOT NULL,
    maintenance_type_id UUID REFERENCES maintenance_types(id) NOT NULL,
    maintenance_plan_id UUID REFERENCES maintenance_plans(id),
    priority VARCHAR(10) DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, URGENT
    status VARCHAR(20) DEFAULT 'PLANNED', -- PLANNED, SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
    description TEXT NOT NULL,
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    assigned_to UUID REFERENCES users(id),
    completed_by UUID REFERENCES users(id),
    work_performed TEXT,
    parts_used TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- REPORTING AND ANALYTICS SCHEMA
-- =====================================================

-- KPI Definitions
CREATE TABLE kpi_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kpi_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    calculation_method TEXT NOT NULL,
    target_value DECIMAL(12,6),
    unit_of_measure VARCHAR(50),
    frequency VARCHAR(20), -- DAILY, WEEKLY, MONTHLY, QUARTERLY
    category VARCHAR(50), -- PRODUCTION, QUALITY, EFFICIENCY, SAFETY
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- KPI Values
CREATE TABLE kpi_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kpi_definition_id UUID REFERENCES kpi_definitions(id) NOT NULL,
    site_id UUID REFERENCES sites(id),
    work_center_id UUID REFERENCES work_centers(id),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    actual_value DECIMAL(12,6) NOT NULL,
    target_value DECIMAL(12,6),
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (kpi_definition_id, site_id, work_center_id, period_start)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Work Orders
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_site_id ON work_orders(site_id);
CREATE INDEX idx_work_orders_due_date ON work_orders(due_date);
CREATE INDEX idx_work_orders_part_id ON work_orders(part_id);

-- Work Order Operations
CREATE INDEX idx_wo_operations_wo_id ON work_order_operations(work_order_id);
CREATE INDEX idx_wo_operations_status ON work_order_operations(status);
CREATE INDEX idx_wo_operations_work_center ON work_order_operations(work_center_id);

-- Inspections
CREATE INDEX idx_inspections_wo_operation ON inspections(work_order_operation_id);
CREATE INDEX idx_inspections_date ON inspections(inspection_date);
CREATE INDEX idx_inspections_result ON inspections(overall_result);

-- Inventory
CREATE INDEX idx_inventory_txn_part_id ON inventory_transactions(part_id);
CREATE INDEX idx_inventory_txn_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_txn_date ON inventory_transactions(performed_at);

-- Serial Numbers
CREATE INDEX idx_serial_numbers_part_id ON serial_numbers(part_id);
CREATE INDEX idx_serial_numbers_wo_id ON serial_numbers(work_order_id);
CREATE INDEX idx_serial_numbers_status ON serial_numbers(status);

-- Audit Log
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Text Search Indexes
CREATE INDEX idx_parts_search ON parts USING gin(to_tsvector('english', part_number || ' ' || part_name || ' ' || description));
CREATE INDEX idx_work_orders_search ON work_orders USING gin(to_tsvector('english', work_order_number || ' ' || customer_order));

-- =====================================================
-- TRIGGERS FOR AUDIT TRAIL
-- =====================================================

-- Function to create audit records
CREATE OR REPLACE FUNCTION create_audit_record()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (entity_type, entity_id, action, old_values)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (entity_type, entity_id, action, old_values, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (entity_type, entity_id, action, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers for critical tables
CREATE TRIGGER audit_work_orders
    AFTER INSERT OR UPDATE OR DELETE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION create_audit_record();

CREATE TRIGGER audit_inspections
    AFTER INSERT OR UPDATE OR DELETE ON inspections
    FOR EACH ROW EXECUTE FUNCTION create_audit_record();

CREATE TRIGGER audit_ncrs
    AFTER INSERT OR UPDATE OR DELETE ON non_conformance_reports
    FOR EACH ROW EXECUTE FUNCTION create_audit_record();

-- =====================================================
-- INITIAL DATA INSERTS
-- =====================================================

-- Insert default roles
INSERT INTO roles (name, description, is_system_role) VALUES
('System Administrator', 'Full system access', true),
('Plant Manager', 'Plant-wide management access', true),
('Production Supervisor', 'Production line supervision', true),
('Production Planner', 'Production planning and scheduling', true),
('Operator', 'Manufacturing operations', true),
('Quality Engineer', 'Quality management and analysis', true),
('Quality Inspector', 'Quality inspections and testing', true),
('Maintenance Technician', 'Equipment maintenance', true);

-- Insert default KPI definitions
INSERT INTO kpi_definitions (kpi_code, name, description, calculation_method, unit_of_measure, frequency, category) VALUES
('OEE', 'Overall Equipment Effectiveness', 'Equipment productivity metric', 'Availability × Performance × Quality', 'Percentage', 'DAILY', 'PRODUCTION'),
('FPY', 'First Pass Yield', 'Quality yield metric', '(Passed Units / Total Units) × 100', 'Percentage', 'DAILY', 'QUALITY'),
('MTTR', 'Mean Time To Repair', 'Equipment reliability metric', 'Total Repair Time / Number of Repairs', 'Hours', 'MONTHLY', 'MAINTENANCE'),
('MTBF', 'Mean Time Between Failures', 'Equipment reliability metric', 'Operating Time / Number of Failures', 'Hours', 'MONTHLY', 'MAINTENANCE');

-- Insert default maintenance types
INSERT INTO maintenance_types (type_code, name, description, is_preventive) VALUES
('PM', 'Preventive Maintenance', 'Scheduled preventive maintenance', true),
('CM', 'Corrective Maintenance', 'Unplanned repair maintenance', false),
('PD', 'Predictive Maintenance', 'Condition-based maintenance', true),
('OM', 'Overhaul Maintenance', 'Major equipment overhaul', true);