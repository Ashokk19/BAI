BEGIN;

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_account_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT NULLIF(
        COALESCE(
            current_setting('request.jwt.claim.account_id', true),
            current_setting('app.current_account_id', true)
        ),
        ''
    );
$$;

CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS bigint
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    value_text text;
BEGIN
    value_text := COALESCE(
        current_setting('request.jwt.claim.user_id', true),
        current_setting('app.current_user_id', true)
    );

    IF value_text IS NULL OR value_text = '' THEN
        RETURN NULL;
    END IF;

    RETURN value_text::bigint;
EXCEPTION
    WHEN invalid_text_representation THEN
        RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION app.current_is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    value_text text;
BEGIN
    value_text := COALESCE(
        current_setting('request.jwt.claim.is_admin', true),
        current_setting('app.current_is_admin', true)
    );

    IF value_text IS NULL OR value_text = '' THEN
        RETURN FALSE;
    END IF;

    RETURN value_text::boolean;
EXCEPTION
    WHEN invalid_text_representation THEN
        RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION app.current_is_master()
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    value_text text;
BEGIN
    value_text := COALESCE(
        current_setting('request.jwt.claim.is_master', true),
        current_setting('app.current_is_master', true)
    );

    IF value_text IS NULL OR value_text = '' THEN
        RETURN FALSE;
    END IF;

    RETURN value_text::boolean;
EXCEPTION
    WHEN invalid_text_representation THEN
        RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION app.same_account(target_account_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT app.current_is_master() OR app.current_account_id() = target_account_id;
$$;

GRANT USAGE ON SCHEMA app TO PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO PUBLIC;

DO $$
DECLARE
    tbl record;
BEGIN
    FOR tbl IN
        SELECT DISTINCT table_name
        FROM (
            SELECT table_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND column_name = 'account_id'
            UNION
            SELECT table_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND column_name = 'item_account_id'
            UNION
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_type = 'BASE TABLE'
              AND table_name IN ('accounts', 'demo_requests')
        ) mapped_tables
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.table_name);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl.table_name);
    END LOOP;
END;
$$;

DO $$
DECLARE
    tbl record;
BEGIN
    FOR tbl IN
        SELECT DISTINCT table_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name = 'account_id'
          AND table_name NOT IN ('accounts', 'demo_requests', 'inventory_logs', 'users')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS app_select_same_account ON public.%I', tbl.table_name);
        EXECUTE format('DROP POLICY IF EXISTS app_insert_same_account ON public.%I', tbl.table_name);
        EXECUTE format('DROP POLICY IF EXISTS app_update_same_account ON public.%I', tbl.table_name);
        EXECUTE format('DROP POLICY IF EXISTS app_delete_same_account ON public.%I', tbl.table_name);

        EXECUTE format(
            'CREATE POLICY app_select_same_account ON public.%I FOR SELECT USING (app.same_account(account_id))',
            tbl.table_name
        );
        EXECUTE format(
            'CREATE POLICY app_insert_same_account ON public.%I FOR INSERT WITH CHECK (app.same_account(account_id))',
            tbl.table_name
        );
        EXECUTE format(
            'CREATE POLICY app_update_same_account ON public.%I FOR UPDATE USING (app.same_account(account_id)) WITH CHECK (app.same_account(account_id))',
            tbl.table_name
        );
        EXECUTE format(
            'CREATE POLICY app_delete_same_account ON public.%I FOR DELETE USING (app.same_account(account_id))',
            tbl.table_name
        );
    END LOOP;
END;
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'users'
    ) THEN
        DROP POLICY IF EXISTS app_select_users ON public.users;
        DROP POLICY IF EXISTS app_insert_users ON public.users;
        DROP POLICY IF EXISTS app_update_users ON public.users;
        DROP POLICY IF EXISTS app_delete_users ON public.users;

        CREATE POLICY app_select_users
        ON public.users
        FOR SELECT
        USING (
            app.current_is_master()
            OR (
                account_id = app.current_account_id()
                AND (
                    app.current_user_id() IS NULL
                    OR app.current_is_admin()
                    OR id = app.current_user_id()
                )
            )
        );

        CREATE POLICY app_insert_users
        ON public.users
        FOR INSERT
        WITH CHECK (app.current_is_master() OR account_id = app.current_account_id());

        CREATE POLICY app_update_users
        ON public.users
        FOR UPDATE
        USING (
            app.current_is_master()
            OR (
                account_id = app.current_account_id()
                AND (
                    app.current_is_admin()
                    OR id = app.current_user_id()
                )
            )
        )
        WITH CHECK (
            app.current_is_master()
            OR (
                account_id = app.current_account_id()
                AND (
                    app.current_is_admin()
                    OR id = app.current_user_id()
                )
            )
        );

        CREATE POLICY app_delete_users
        ON public.users
        FOR DELETE
        USING (
            app.current_is_master()
            OR (
                account_id = app.current_account_id()
                AND (
                    app.current_is_admin()
                    OR id = app.current_user_id()
                )
            )
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'inventory_logs'
    ) THEN
        DROP POLICY IF EXISTS app_select_inventory_logs ON public.inventory_logs;
        DROP POLICY IF EXISTS app_insert_inventory_logs ON public.inventory_logs;
        DROP POLICY IF EXISTS app_update_inventory_logs ON public.inventory_logs;
        DROP POLICY IF EXISTS app_delete_inventory_logs ON public.inventory_logs;

        CREATE POLICY app_select_inventory_logs
        ON public.inventory_logs
        FOR SELECT
        USING (app.current_is_master() OR item_account_id = app.current_account_id());

        CREATE POLICY app_insert_inventory_logs
        ON public.inventory_logs
        FOR INSERT
        WITH CHECK (app.current_is_master() OR item_account_id = app.current_account_id());

        CREATE POLICY app_update_inventory_logs
        ON public.inventory_logs
        FOR UPDATE
        USING (app.current_is_master() OR item_account_id = app.current_account_id())
        WITH CHECK (app.current_is_master() OR item_account_id = app.current_account_id());

        CREATE POLICY app_delete_inventory_logs
        ON public.inventory_logs
        FOR DELETE
        USING (app.current_is_master() OR item_account_id = app.current_account_id());
    END IF;
END;
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'accounts'
    ) THEN
        DROP POLICY IF EXISTS app_select_active_accounts_public ON public.accounts;
        DROP POLICY IF EXISTS app_select_accounts_master ON public.accounts;
        DROP POLICY IF EXISTS app_insert_accounts_master ON public.accounts;
        DROP POLICY IF EXISTS app_update_accounts_master ON public.accounts;
        DROP POLICY IF EXISTS app_delete_accounts_master ON public.accounts;

        CREATE POLICY app_select_active_accounts_public
        ON public.accounts
        FOR SELECT
        USING (COALESCE(is_active, TRUE) = TRUE);

        CREATE POLICY app_select_accounts_master
        ON public.accounts
        FOR SELECT
        USING (app.current_is_master());

        CREATE POLICY app_insert_accounts_master
        ON public.accounts
        FOR INSERT
        WITH CHECK (app.current_is_master());

        CREATE POLICY app_update_accounts_master
        ON public.accounts
        FOR UPDATE
        USING (app.current_is_master())
        WITH CHECK (app.current_is_master());

        CREATE POLICY app_delete_accounts_master
        ON public.accounts
        FOR DELETE
        USING (app.current_is_master());
    END IF;
END;
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'demo_requests'
    ) THEN
        DROP POLICY IF EXISTS app_insert_demo_requests_public ON public.demo_requests;
        DROP POLICY IF EXISTS app_select_demo_requests_master ON public.demo_requests;
        DROP POLICY IF EXISTS app_update_demo_requests_master ON public.demo_requests;
        DROP POLICY IF EXISTS app_delete_demo_requests_master ON public.demo_requests;

        CREATE POLICY app_insert_demo_requests_public
        ON public.demo_requests
        FOR INSERT
        WITH CHECK (TRUE);

        CREATE POLICY app_select_demo_requests_master
        ON public.demo_requests
        FOR SELECT
        USING (app.current_is_master());

        CREATE POLICY app_update_demo_requests_master
        ON public.demo_requests
        FOR UPDATE
        USING (app.current_is_master())
        WITH CHECK (app.current_is_master());

        CREATE POLICY app_delete_demo_requests_master
        ON public.demo_requests
        FOR DELETE
        USING (app.current_is_master());
    END IF;
END;
$$;

COMMIT;
