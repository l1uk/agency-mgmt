#!/bin/bash

# Carica le variabili d'ambiente dal file .env (o .env.example come fallback)
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
  ENV_FILE=".env.example"
fi

if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

# Controlla se l'ambiente è stato fornito
if [ -z "$1" ] || ([ "$1" != "test" ] && [ "$1" != "prod" ]); then
  echo "Errore: Devi fornire l'ambiente (test o prod)."
  echo "Utilizzo: ./deploy_functions.sh <test|prod>"
  exit 1
fi

ENVIRONMENT=$1

# ================================================================
# CONFIGURAZIONE AMBIENTI
# ================================================================

if [ "$ENVIRONMENT" = "prod" ]; then
  PROJECT_REF="kxmciflaimtwpvbepsis"
  AGENT_INVITE_REDIRECT_TO="https://huntmodels.vercel.app/invite-agent"
  SCHOOL_INVITE_REDIRECT_TO="https://huntmodels.vercel.app/invite-school"
  EDGE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bWNpZmxhaW10d3B2YmVwc2lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MDMyMzUsImV4cCI6MjA5MjI3OTIzNX0.wMSgAshLkmqgEsExMhT8IqZieeurhtf4Cr3GPytNHSk"
  DB_HOST="db.kxmciflaimtwpvbepsis.supabase.co"
  DB_PORT="5432"
  DB_USER="postgres"
  DB_PASSWORD="${PROD_DB_PASSWORD}"
  ENV_LABEL="🚀 PROD"
else  # test
  PROJECT_REF="test_project_ref_here"
  AGENT_INVITE_REDIRECT_TO="https://test.huntmodels.vercel.app/invite-agent"
  SCHOOL_INVITE_REDIRECT_TO="https://test.huntmodels.vercel.app/invite-school"
  EDGE_ANON_KEY="test_anon_key_here"
  DB_HOST="db.test_project_ref_here.supabase.co"
  DB_PORT="5432"
  DB_USER="postgres"
  DB_PASSWORD="${TEST_DB_PASSWORD}"
  ENV_LABEL="🧪 TEST"
fi

# Costruisci connection string se password è disponibile
if [ -n "$DB_PASSWORD" ]; then
  DB_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/postgres"
else
  DB_URL=""
fi

echo "========================"
echo "$ENV_LABEL - Deploy"
echo "========================"
echo "Project Ref: $PROJECT_REF"

echo ""
echo "🔐 Impostazione dei Secrets per il progetto: $PROJECT_REF"

# 1. DEPLOY DEI SECRETS
# Imposto solo i secrets richiesti per le funzioni di invito.
AGENT_INVITE_REDIRECT_TO_VALUE="$AGENT_INVITE_REDIRECT_TO"
SCHOOL_INVITE_REDIRECT_TO_VALUE="$SCHOOL_INVITE_REDIRECT_TO"
EDGE_ANON_KEY_VALUE="$EDGE_ANON_KEY"

echo "Imposto i seguenti secrets per $ENVIRONMENT (controlla i valori prima del deploy):"
echo " - AGENT_INVITE_REDIRECT_TO: $AGENT_INVITE_REDIRECT_TO_VALUE"
echo " - SCHOOL_INVITE_REDIRECT_TO: $SCHOOL_INVITE_REDIRECT_TO_VALUE"
echo " - EDGE_SUPABASE_ANON_KEY: ${EDGE_ANON_KEY_VALUE:0:8}... (hidden)"

npx supabase secrets set --project-ref "$PROJECT_REF" \
  AGENT_INVITE_REDIRECT_TO="$AGENT_INVITE_REDIRECT_TO_VALUE" \
  SCHOOL_INVITE_REDIRECT_TO="$SCHOOL_INVITE_REDIRECT_TO_VALUE" \
  EDGE_SUPABASE_ANON_KEY="$EDGE_ANON_KEY_VALUE"

echo "✅ Secrets impostati correttamente."

# # 1b. ESECUZIONE SCHEMA (opzionale)
# if [ -z "$SKIP_SCHEMA" ]; then
#   echo ""
#   echo "🗄️  Eseguo schema.sql sul database..."
#   
#   # Controlla se DB_URL è impostato
#   if [ -z "$DB_URL" ]; then
#     echo "⚠️  DB_PASSWORD non configurato per questo ambiente."
#     if [ "$ENVIRONMENT" = "prod" ]; then
#       echo "Imposta: export PROD_DB_PASSWORD='your_password_here'"
#     else
#       echo "Imposta: export TEST_DB_PASSWORD='your_password_here'"
#     fi
#     echo "Per saltare questo step: export SKIP_SCHEMA=1"
#     echo ""
#     read -p "Vuoi continuare senza eseguire lo schema? (s/n) " -n 1 -r
#     echo ""
#     if [[ $REPLY =~ ^[Ss]$ ]]; then
#       export SKIP_SCHEMA=1
#     fi
#   fi
#   
#   if [ -n "$DB_URL" ]; then
#     # Esegui schema.sql via psql
#     if psql "$DB_URL" -f ../schema.sql > /dev/null 2>&1; then
#       echo "✅ Schema eseguito correttamente."
#     else
#       echo "⚠️  Errore durante l'esecuzione dello schema. Continuo comunque con il deploy delle funzioni."
#       echo "Nota: puoi eseguire manualmente schema.sql dalla console Supabase."
#     fi
#   fi
# fi

echo ""
echo "🚀 Inizio deploy delle funzioni..."

# 2. DEPLOY DELLE FUNZIONI
functions=(
  "invite-agent-account"
  "send-contract-expiry-notifications"
  "send-contract-renewal-confirmation"
  "invite-school-account"
)

for func in "${functions[@]}"; do
  echo "-----------------------------------------------"
  echo "📦 Deploying: $func..."
  npx supabase functions deploy "$func" --project-ref "$PROJECT_REF" --no-verify-jwt
done

echo "-----------------------------------------------"
echo "✨ Deploy $ENVIRONMENT completato con successo!"