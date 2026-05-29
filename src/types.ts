/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ComponenteEletronico {
  id: string;
  sku: string;          // Obrigatório e único
  nome: string;         // Obrigatório e único
  categoria: string;    // Obrigatório (Arduino, Sensores, Célula de Carga, Motores, etc.)
  quantidade: number;   // Obrigatório e >= 0
  valorCompra: number;  // Obrigatório (Valor de compra individual) e >= 0
  valorVenda: number;   // Obrigatório (Valor de venda individual) e >= 0
  minimoEstoque: number;// Nível mínimo para alertas de reposições automáticas
  localizacao?: string; // Prateleira, Gaveta, Caixa Organizadora
  descricao?: string;   // Descrição básica técnica (ex: Tensão de operação, corrente)
  criadoEm: string;
  atualizadoEm: string;
}

export type TipoMovimentacao = 'entrada' | 'saida' | 'venda' | 'ajuste';

export interface MovimentacaoEstoque {
  id: string;
  pedidoId?: string; // Identificador unificado para o lote/pedido (ex: PED-10543)
  componenteId: string;
  componenteNome: string;
  componenteSku: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  data: string;
  motivo: string;
  valorTotal?: number;
}

export interface CategoriaConfig {
  id: string;
  nome: string;
  cor: string; // Tailwind class color like 'bg-blue-100 text-blue-800' or border classes
  icone: string; // Lucide icon string match
}

export interface DashboardStats {
  totalItensUnicos: number;
  totalUnidades: number;
  valorTotalCompra: number;
  valorTotalVenda: number;
  lucroPotencialTotal: number;
  itensEstoqueBaixo: number;
  itensForaEstoque: number;
}
