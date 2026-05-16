-- ============================================================
-- Brava — Migración inicial
-- Ejecutar en el SQL Editor de Supabase (en orden)
-- ============================================================

-- ── Extensiones ──────────────────────────────────────────────
-- (ya habilitadas en Supabase por defecto, incluidas por claridad)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 1. ACCOUNTS (ampliar tabla existente)
--    Añade columnas del nuevo esquema manteniendo compat. con
--    los campos legacy (bank, balance, type).
-- ============================================================
ALTER TABLE IF EXISTS accounts
  ADD COLUMN IF NOT EXISTS nombre   text,
  ADD COLUMN IF NOT EXISTS banco    text,
  ADD COLUMN IF NOT EXISTS tipo     text DEFAULT 'corriente'
    CHECK (tipo IN ('corriente','ahorros','digital','negocio','otro')),
  ADD COLUMN IF NOT EXISTS saldo    numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS moneda   text DEFAULT 'PEN'
    CHECK (moneda IN ('PEN','USD')),
  ADD COLUMN IF NOT EXISTS activa   boolean DEFAULT true;

-- Si la tabla todavía no existe (instalación nueva):
CREATE TABLE IF NOT EXISTS accounts (
  id          bigserial       PRIMARY KEY,
  local_id    text            UNIQUE,
  user_id     uuid            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Campos nuevos
  nombre      text,
  banco       text,
  tipo        text            DEFAULT 'corriente'
                              CHECK (tipo IN ('corriente','ahorros','digital','negocio','otro')),
  saldo       numeric(14,2)   DEFAULT 0,
  moneda      text            DEFAULT 'PEN' CHECK (moneda IN ('PEN','USD')),
  activa      boolean         DEFAULT true,
  -- Campos legacy (compatibilidad)
  bank        text,
  balance     numeric(14,2)   DEFAULT 0,
  type        text,
  -- Meta
  created_at  timestamptz     DEFAULT now()
);


-- ============================================================
-- 2. CREDIT_LINES — Líneas de crédito / Tarjetas
-- ============================================================
CREATE TABLE IF NOT EXISTS credit_lines (
  id          bigserial       PRIMARY KEY,
  local_id    text            UNIQUE,
  user_id     uuid            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  nombre      text            NOT NULL,
  banco       text,
  tipo        text            DEFAULT 'visa'
                              CHECK (tipo IN ('visa','mastercard','amex','otro')),
  limite      numeric(14,2)   DEFAULT 0,
  usado       numeric(14,2)   DEFAULT 0,
  moneda      text            DEFAULT 'PEN' CHECK (moneda IN ('PEN','USD')),

  -- Día del mes (1-28): fecha de corte y fecha de pago
  fecha_corte int             CHECK (fecha_corte BETWEEN 1 AND 31),
  fecha_pago  int             CHECK (fecha_pago  BETWEEN 1 AND 31),

  activa      boolean         DEFAULT true,
  created_at  timestamptz     DEFAULT now()
);

COMMENT ON TABLE  credit_lines              IS 'Tarjetas de crédito y líneas de crédito del usuario';
COMMENT ON COLUMN credit_lines.fecha_corte  IS 'Día del mes en que cierra el período de facturación';
COMMENT ON COLUMN credit_lines.fecha_pago   IS 'Día del mes en que vence el pago mínimo';
COMMENT ON COLUMN credit_lines.usado        IS 'Monto actualmente utilizado de la línea';


-- ============================================================
-- 3. LOANS — Préstamos
-- ============================================================
CREATE TABLE IF NOT EXISTS loans (
  id              bigserial       PRIMARY KEY,
  local_id        text            UNIQUE,
  user_id         uuid            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  nombre          text            NOT NULL,
  banco           text,
  tipo            text            DEFAULT 'personal'
                                  CHECK (tipo IN ('hipotecario','vehicular','personal','otro')),
  monto_original  numeric(14,2)   DEFAULT 0,
  saldo_pendiente numeric(14,2)   DEFAULT 0,
  cuota           numeric(14,2)   DEFAULT 0,   -- Cuota mensual fija
  tasa_anual      numeric(6,3)    DEFAULT 0,   -- Tasa efectiva anual %
  fecha_inicio    date,
  fecha_fin       date,
  dia_pago        int             CHECK (dia_pago BETWEEN 1 AND 31),
  moneda          text            DEFAULT 'PEN' CHECK (moneda IN ('PEN','USD')),
  activo          boolean         DEFAULT true,

  created_at      timestamptz     DEFAULT now()
);

COMMENT ON TABLE  loans               IS 'Préstamos activos del usuario';
COMMENT ON COLUMN loans.cuota         IS 'Monto de la cuota mensual (capital + interés)';
COMMENT ON COLUMN loans.tasa_anual    IS 'Tasa de costo efectivo anual (TCEA) en porcentaje';
COMMENT ON COLUMN loans.dia_pago      IS 'Día del mes en que vence la cuota';


-- ============================================================
-- 4. LOAN_PAYMENTS — Registro de cuotas pagadas
-- ============================================================
CREATE TABLE IF NOT EXISTS loan_payments (
  id          bigserial       PRIMARY KEY,
  local_id    text            UNIQUE,
  user_id     uuid            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  loan_id     text            NOT NULL,  -- local_id del préstamo
  amount      numeric(14,2)   NOT NULL,
  capital     numeric(14,2)   DEFAULT 0,
  interes     numeric(14,2)   DEFAULT 0,
  date        date            NOT NULL DEFAULT CURRENT_DATE,
  notes       text            DEFAULT '',
  account_id  text,           -- local_id de la cuenta debitada (opcional)

  created_at  timestamptz     DEFAULT now()
);

COMMENT ON TABLE  loan_payments           IS 'Historial de cuotas pagadas por préstamo';
COMMENT ON COLUMN loan_payments.capital   IS 'Porción que reduce el saldo del principal';
COMMENT ON COLUMN loan_payments.interes   IS 'Porción correspondiente a intereses';
COMMENT ON COLUMN loan_payments.account_id IS 'Cuenta bancaria desde la cual se realizó el pago';


-- ============================================================
-- 5. ACCOUNT_MOVEMENTS — Movimientos de cuentas bancarias
-- ============================================================
CREATE TABLE IF NOT EXISTS account_movements (
  id          bigserial       PRIMARY KEY,
  local_id    text            UNIQUE,
  user_id     uuid            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  account_id  text            NOT NULL,  -- local_id de la cuenta
  type        text            NOT NULL   DEFAULT 'expense'
                              CHECK (type IN ('income','expense','transfer')),
  description text            NOT NULL,
  amount      numeric(14,2)   NOT NULL,
  delta       numeric(14,2)   NOT NULL,  -- +N ingreso, -N egreso
  date        date            NOT NULL DEFAULT CURRENT_DATE,

  -- Relaciones opcionales (local IDs del frontend)
  invoice_id  text,
  loan_id     text,

  created_at  timestamptz     DEFAULT now()
);

COMMENT ON TABLE  account_movements        IS 'Registro de todos los movimientos de cuentas';
COMMENT ON COLUMN account_movements.delta  IS 'Impacto en saldo: positivo = crédito, negativo = débito';


-- ============================================================
-- 6. MONTHLY_CHECKS — Lista de pagos marcados del mes
-- ============================================================
CREATE TABLE IF NOT EXISTS monthly_checks (
  id          bigserial       PRIMARY KEY,
  user_id     uuid            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Clave compuesta: "<tipo>-<itemId>-<YYYY-MM>"
  -- tipo: 'bill' | 'loan' | 'credit'
  check_key   text            NOT NULL,
  paid        boolean         DEFAULT false,
  paid_at     date,

  created_at  timestamptz     DEFAULT now(),

  UNIQUE (user_id, check_key)
);

COMMENT ON TABLE  monthly_checks           IS 'Estado de la checklist de pagos mensuales (PaymentsView)';
COMMENT ON COLUMN monthly_checks.check_key IS 'Clave única: tipo-itemId-YYYY-MM  (ej: bill-abc123-2026-05)';


-- ============================================================
-- 7. MONTHLY_SNAPSHOTS — Instantáneas financieras mensuales
-- ============================================================
CREATE TABLE IF NOT EXISTS monthly_snapshots (
  id              bigserial       PRIMARY KEY,
  user_id         uuid            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  year            int             NOT NULL,
  month           int             NOT NULL CHECK (month BETWEEN 1 AND 12),

  in_this_month   numeric(14,2)   DEFAULT 0,
  out_this_month  numeric(14,2)   DEFAULT 0,
  neto            numeric(14,2)   DEFAULT 0,
  cash_available  numeric(14,2)   DEFAULT 0,

  saved_at        timestamptz     DEFAULT now(),

  UNIQUE (user_id, year, month)
);

COMMENT ON TABLE monthly_snapshots IS 'Registro histórico de métricas financieras mensuales (Overview)';


-- ============================================================
-- ÍNDICES — Optimización de consultas frecuentes
-- ============================================================

-- Accounts
CREATE INDEX IF NOT EXISTS idx_accounts_user_id
  ON accounts (user_id);

-- Credit lines
CREATE INDEX IF NOT EXISTS idx_credit_lines_user_id
  ON credit_lines (user_id);

-- Loans
CREATE INDEX IF NOT EXISTS idx_loans_user_id
  ON loans (user_id);
CREATE INDEX IF NOT EXISTS idx_loans_activo
  ON loans (user_id, activo)
  WHERE activo = true;

-- Loan payments
CREATE INDEX IF NOT EXISTS idx_loan_payments_user_id
  ON loan_payments (user_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id
  ON loan_payments (user_id, loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_date
  ON loan_payments (user_id, date DESC);

-- Account movements
CREATE INDEX IF NOT EXISTS idx_account_movements_user_id
  ON account_movements (user_id);
CREATE INDEX IF NOT EXISTS idx_account_movements_account_id
  ON account_movements (user_id, account_id);
CREATE INDEX IF NOT EXISTS idx_account_movements_date
  ON account_movements (user_id, date DESC);

-- Monthly checks
CREATE INDEX IF NOT EXISTS idx_monthly_checks_user_id
  ON monthly_checks (user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_checks_key
  ON monthly_checks (user_id, check_key);

-- Monthly snapshots
CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_user_id
  ON monthly_snapshots (user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_period
  ON monthly_snapshots (user_id, year DESC, month DESC);


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Cada usuario solo puede ver y modificar sus propios datos.
-- ============================================================

-- Accounts
ALTER TABLE accounts           ENABLE ROW LEVEL SECURITY;
-- Credit lines
ALTER TABLE credit_lines       ENABLE ROW LEVEL SECURITY;
-- Loans
ALTER TABLE loans              ENABLE ROW LEVEL SECURITY;
-- Loan payments
ALTER TABLE loan_payments      ENABLE ROW LEVEL SECURITY;
-- Account movements
ALTER TABLE account_movements  ENABLE ROW LEVEL SECURITY;
-- Monthly checks
ALTER TABLE monthly_checks     ENABLE ROW LEVEL SECURITY;
-- Monthly snapshots
ALTER TABLE monthly_snapshots  ENABLE ROW LEVEL SECURITY;


-- ── Policies: cada tabla sigue el mismo patrón ───────────────

-- accounts
CREATE POLICY "accounts_select" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "accounts_insert" ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_update" ON accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "accounts_delete" ON accounts FOR DELETE USING (auth.uid() = user_id);

-- credit_lines
CREATE POLICY "credit_lines_select" ON credit_lines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "credit_lines_insert" ON credit_lines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "credit_lines_update" ON credit_lines FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "credit_lines_delete" ON credit_lines FOR DELETE USING (auth.uid() = user_id);

-- loans
CREATE POLICY "loans_select" ON loans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "loans_insert" ON loans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "loans_update" ON loans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "loans_delete" ON loans FOR DELETE USING (auth.uid() = user_id);

-- loan_payments
CREATE POLICY "loan_payments_select" ON loan_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "loan_payments_insert" ON loan_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "loan_payments_update" ON loan_payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "loan_payments_delete" ON loan_payments FOR DELETE USING (auth.uid() = user_id);

-- account_movements
CREATE POLICY "acct_mov_select" ON account_movements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "acct_mov_insert" ON account_movements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "acct_mov_update" ON account_movements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "acct_mov_delete" ON account_movements FOR DELETE USING (auth.uid() = user_id);

-- monthly_checks
CREATE POLICY "monthly_checks_select" ON monthly_checks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "monthly_checks_insert" ON monthly_checks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "monthly_checks_update" ON monthly_checks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "monthly_checks_delete" ON monthly_checks FOR DELETE USING (auth.uid() = user_id);

-- monthly_snapshots
CREATE POLICY "snapshots_select" ON monthly_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "snapshots_insert" ON monthly_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "snapshots_update" ON monthly_snapshots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "snapshots_delete" ON monthly_snapshots FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- FUNCIÓN AUXILIAR — Upsert de monthly_checks
-- Usada desde el frontend para marcar/desmarcar pagos
-- ============================================================
CREATE OR REPLACE FUNCTION upsert_monthly_check(
  p_user_id   uuid,
  p_check_key text,
  p_paid      boolean,
  p_paid_at   date DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO monthly_checks (user_id, check_key, paid, paid_at)
  VALUES (p_user_id, p_check_key, p_paid, p_paid_at)
  ON CONFLICT (user_id, check_key)
  DO UPDATE SET
    paid    = EXCLUDED.paid,
    paid_at = EXCLUDED.paid_at;
END;
$$;

COMMENT ON FUNCTION upsert_monthly_check IS
  'Inserta o actualiza el estado de un pago en la checklist mensual';


-- ============================================================
-- FUNCIÓN AUXILIAR — Upsert de monthly_snapshots
-- ============================================================
CREATE OR REPLACE FUNCTION upsert_monthly_snapshot(
  p_user_id        uuid,
  p_year           int,
  p_month          int,
  p_in_this_month  numeric,
  p_out_this_month numeric,
  p_neto           numeric,
  p_cash_available numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO monthly_snapshots
    (user_id, year, month, in_this_month, out_this_month, neto, cash_available)
  VALUES
    (p_user_id, p_year, p_month, p_in_this_month, p_out_this_month, p_neto, p_cash_available)
  ON CONFLICT (user_id, year, month)
  DO NOTHING;  -- snapshot ya existe, no sobreescribir el histórico
END;
$$;

COMMENT ON FUNCTION upsert_monthly_snapshot IS
  'Guarda una instantánea financiera mensual solo si no existe una ya para ese período';
