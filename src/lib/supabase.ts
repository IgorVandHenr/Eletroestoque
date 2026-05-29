import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ComponenteEletronico, MovimentacaoEstoque } from '../types';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  enabled: boolean;
}

const STORAGE_CONFIG_KEY = 'eletro_supabase_config';

// 1. Get current configuration
export function getSupabaseConfig(): SupabaseConfig {
  try {
    const stored = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Erro ao ler configuração do Supabase do localStorage:', e);
  }

  // Fallback to Env variables if defined
  const metaEnv = (import.meta as any).env || {};
  const url = (metaEnv.VITE_SUPABASE_URL || '').trim();
  const anonKey = (metaEnv.VITE_SUPABASE_ANON_KEY || '').trim();
  
  return {
    url,
    anonKey,
    enabled: url !== '' && anonKey !== '',
  };
}

// 2. Save dynamic configuration to localStorage
export function saveSupabaseConfig(url: string, anonKey: string, enabled: boolean): void {
  const config: SupabaseConfig = {
    url: url.trim(),
    anonKey: anonKey.trim(),
    enabled,
  };
  localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
}

// 3. Instantiate Supabase Client dynamically
let supabaseInstance: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.enabled || !config.url || !config.anonKey) {
    supabaseInstance = null;
    return null;
  }

  // Reuse instance if it has the same config
  if (supabaseInstance && lastUrl === config.url && lastKey === config.anonKey) {
    return supabaseInstance;
  }

  try {
    lastUrl = config.url;
    lastKey = config.anonKey;
    supabaseInstance = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
      }
    });
    return supabaseInstance;
  } catch (err) {
    console.error('Falha ao instanciar o cliente Supabase:', err);
    return null;
  }
}

// 4. Data Mappers (CamelCase TS <-> snake_case Postgres)
function mapToPostgresComponent(c: ComponenteEletronico) {
  return {
    id: c.id,
    sku: c.sku,
    nome: c.nome,
    categoria: c.categoria,
    quantidade: c.quantidade,
    valor_compra: c.valorCompra,
    valor_venda: c.valorVenda,
    minimo_estoque: c.minimoEstoque,
    localizacao: c.localizacao || null,
    descricao: c.descricao || null,
    criado_em: c.criadoEm,
    atualizado_em: c.atualizadoEm,
  };
}

function mapToTsComponent(p: any): ComponenteEletronico {
  return {
    id: p.id,
    sku: p.sku,
    nome: p.nome,
    categoria: p.categoria,
    quantidade: Number(p.quantidade),
    valorCompra: Number(p.valor_compra),
    valorVenda: Number(p.valor_venda),
    minimoEstoque: Number(p.minimo_estoque),
    localizacao: p.localizacao || undefined,
    descricao: p.descricao || undefined,
    criadoEm: p.criado_em,
    atualizadoEm: p.atualizado_em,
  };
}

function mapToPostgresHistory(h: MovimentacaoEstoque) {
  return {
    id: h.id,
    pedido_id: h.pedidoId || null,
    componente_id: h.componenteId,
    componente_nome: h.componenteNome,
    componente_sku: h.componenteSku,
    tipo: h.tipo,
    quantidade: h.quantidade,
    data: h.data,
    motivo: h.motivo,
    valor_total: h.valorTotal !== undefined ? h.valorTotal : null,
  };
}

function mapToTsHistory(p: any): MovimentacaoEstoque {
  return {
    id: p.id,
    pedidoId: p.pedido_id || undefined,
    componenteId: p.componente_id,
    componenteNome: p.componente_nome,
    componenteSku: p.componente_sku,
    tipo: p.tipo as any,
    quantidade: Number(p.quantidade),
    data: p.data,
    motivo: p.motivo,
    valorTotal: p.valor_total !== null ? Number(p.valor_total) : undefined,
  };
}

// 5. Operations on Supabase Database
export async function dbFetchComponents(): Promise<ComponenteEletronico[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não conectado.');

  const { data, error } = await client
    .from('eletro_componentes')
    .select('*')
    .order('nome', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map(mapToTsComponent);
}

export async function dbFetchHistory(): Promise<MovimentacaoEstoque[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não conectado.');

  const { data, error } = await client
    .from('eletro_movimentacoes')
    .select('*')
    .order('data', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(mapToTsHistory);
}

export async function dbUpsertComponent(comp: ComponenteEletronico): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não conectado.');

  const pgData = mapToPostgresComponent(comp);
  const { error } = await client
    .from('eletro_componentes')
    .upsert(pgData, { onConflict: 'id' });

  if (error) {
    throw error;
  }
}

export async function dbDeleteComponent(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não conectado.');

  const { error } = await client
    .from('eletro_componentes')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function dbInsertHistoryItem(hist: MovimentacaoEstoque): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não conectado.');

  const pgData = mapToPostgresHistory(hist);
  const { error } = await client
    .from('eletro_movimentacoes')
    .insert([pgData]);

  if (error) {
    throw error;
  }
}

export async function dbClearHistory(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não conectado.');

  // Delete all movimentacoes
  const { error } = await client
    .from('eletro_movimentacoes')
    .delete()
    .neq('id', 'placeholder_impossible_string');

  if (error) {
    throw error;
  }
}

// 6. SQL scripts for user copy-paste setup in Supabase SQL Editor
export const SUPABASE_SQL_SETUP = `-- 1. CRIAÇÃO DA TABELA DE COMPONENTES ELETRÔNICOS
CREATE TABLE IF NOT EXISTS public.eletro_componentes (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    nome TEXT UNIQUE NOT NULL,
    categoria TEXT NOT NULL,
    quantidade INTEGER NOT NULL CHECK (quantidade >= 0),
    valor_compra NUMERIC(12,2) NOT NULL CHECK (valor_compra >= 0),
    valor_venda NUMERIC(12,2) NOT NULL CHECK (valor_venda >= 0),
    minimo_estoque INTEGER NOT NULL CHECK (minimo_estoque >= 0),
    localizacao TEXT,
    descricao TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. CRIAÇÃO DA TABELA DE MOVIMENTAÇÕES DE ESTOQUE (LOGS)
CREATE TABLE IF NOT EXISTS public.eletro_movimentacoes (
    id TEXT PRIMARY KEY,
    pedido_id TEXT, -- Identificador unificado para o lote/pedido (ex: PED-10543)
    componente_id TEXT NOT NULL REFERENCES public.eletro_componentes(id) ON DELETE CASCADE,
    componente_nome TEXT NOT NULL,
    componente_sku TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'venda', 'ajuste')),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    data TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    motivo TEXT NOT NULL,
    valor_total NUMERIC(12,2)
);

-- 3. HABILITAR SEGURANÇA (OPCIONAL - DESABILITA RLS PARA USO DIRETO RÁPIDO DO ANON KEY)
-- Se desejar utilizar tabelas públicas acessíveis pela chave anon diretamente:
ALTER TABLE public.eletro_componentes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.eletro_movimentacoes DISABLE ROW LEVEL SECURITY;
`;

// 7. Full Synchronization function: upload existing local stuff to cloud
export async function syncLocalDataToSupabase(
  comps: ComponenteEletronico[],
  hist: MovimentacaoEstoque[]
): Promise<{ successComps: number; successHist: number }> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não conectado.');

  let successComps = 0;
  let successHist = 0;

  // Insert/Upsert components first
  for (const comp of comps) {
    try {
      await dbUpsertComponent(comp);
      successComps++;
    } catch (e) {
      console.warn(`Erro ao sincronizar componente ${comp.sku} para o Supabase:`, e);
    }
  }

  // Insert/Upsert history entries (we try an insert or upsert)
  for (const entry of hist) {
    try {
      const pgData = mapToPostgresHistory(entry);
      await client.from('eletro_movimentacoes').upsert(pgData, { onConflict: 'id' });
      successHist++;
    } catch (e) {
      console.warn(`Erro ao sincronizar histórico ${entry.id} para o Supabase:`, e);
    }
  }

  return { successComps, successHist };
}
