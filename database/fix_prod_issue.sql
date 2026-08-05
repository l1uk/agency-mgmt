
BEGIN;

-- =========================================================================
-- 1. CASO ZALANDO (Modello: Odescalchi Emilio - ID: 776deb2c-84a3-42b9-b8ee-1ddfe5c70784)
-- Master Contract: f5d8c4d5-e4c5-4577-a9da-6de2f14c8243
-- =========================================================================

DO $$ 
DECLARE master_zalando_id UUID := 'f5d8c4d5-e4c5-4577-a9da-6de2f14c8243';
DECLARE model_emilio_id UUID := '776deb2c-84a3-42b9-b8ee-1ddfe5c70784';
BEGIN

    -- A. Sposta tutti i pagamenti (incassi) dai cloni verso il contratto Master
    UPDATE payments 
    SET contract_id = master_zalando_id
    WHERE contract_id IN (
        SELECT id FROM contracts 
        WHERE model_id = model_emilio_id
        AND client_name ILIKE 'Zalando%' 
        AND id != master_zalando_id
    );

    -- B. Elimina i contratti cloni ormai vuoti
    DELETE FROM contracts 
    WHERE model_id = model_emilio_id
    AND client_name ILIKE 'Zalando%' 
    AND id != master_zalando_id;

    -- C. Normalizza il nome del cliente sul Master (Sistema i vari "Zalando Ai")
    UPDATE contracts 
    SET client_name = 'Zalando' 
    WHERE id = master_zalando_id;

END $$;

-- =========================================================================
-- 2. CASO TRUSSARDI (Modello: Francesco Faraguti - ID: b008c760-ff8c-4147-a607-9a5cbef633ed)
-- Master Contract: 4c6473c4-8b80-45d3-bcb3-c4815e207521
-- =========================================================================

DO $$ 
DECLARE master_trussardi_id UUID := '4c6473c4-8b80-45d3-bcb3-c4815e207521';
DECLARE model_francesco_id UUID := 'b008c760-ff8c-4147-a607-9a5cbef633ed';
BEGIN

    -- A. Sposta i pagamenti
    UPDATE payments 
    SET contract_id = master_trussardi_id
    WHERE contract_id IN (
        SELECT id FROM contracts 
        WHERE model_id = model_francesco_id 
        AND client_name ILIKE 'Trussardi%' 
        AND id != master_trussardi_id
    );

    -- B. Elimina i cloni
    DELETE FROM contracts 
    WHERE model_id = model_francesco_id
    AND client_name ILIKE 'Trussardi%' 
    AND id != master_trussardi_id;

END $$;

COMMIT;