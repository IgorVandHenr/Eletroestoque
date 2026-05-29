/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MovimentacaoEstoque, TipoMovimentacao } from '../types';
import { 
  History, 
  Calendar, 
  CornerDownRight, 
  CornerDownLeft, 
  RefreshCw, 
  Trash2, 
  Filter, 
  Search,
  ChevronDown,
  ChevronUp,
  Receipt,
  User,
  DollarSign
} from 'lucide-react';

interface TransactionHistoryProps {
  movimentacoes: MovimentacaoEstoque[];
  onClearHistory: () => void;
}

interface GroupedOrder {
  pedidoId: string;
  data: string;
  clienteNome: string;
  metodoPagamento: string;
  observacao: string;
  itens: {
    sku: string;
    nome: string;
    quantidade: number;
    valorTotal: number;
  }[];
  valorTotalGeral: number;
}

export default function TransactionHistory({ movimentacoes, onClearHistory }: TransactionHistoryProps) {
  const [activeSubTab, setActiveSubTab] = useState<'pedidos' | 'movimentacoes'>('pedidos');
  const [filtroTipo, setFiltroTipo] = useState<TipoMovimentacao | 'todos'>('todos');
  const [buscaTerm, setBuscaTerm] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<{ [id: string]: boolean }>({});

  const toggleOrderExpand = (id: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const parseMotivo = (motivo: string) => {
    let clienteNome = 'Consumidor Final';
    let metodoPagamento = 'Dinheiro';
    let observacao = '';

    if (motivo.includes('Venda PDV')) {
      const parts = motivo.split(' | ');
      parts.forEach(part => {
        if (part.includes('Cliente:')) {
          clienteNome = part.replace('Venda PDV - Cliente:', '').trim();
        } else if (part.includes('Pagamento:')) {
          metodoPagamento = part.replace('Pagamento:', '').trim();
        } else if (part.includes('Obs:')) {
          observacao = part.replace('Obs:', '').trim();
        }
      });
    } else {
      observacao = motivo;
    }

    return { clienteNome, metodoPagamento, observacao };
  };

  // Group Vendas type by order number (pedidoId)
  const salesGrouped: { [id: string]: GroupedOrder } = {};

  movimentacoes.forEach(m => {
    if (m.tipo !== 'venda') return;

    const pedId = m.pedidoId || `PED-AVULSO-${m.id.substring(4, 9)}`;
    const { clienteNome, metodoPagamento, observacao } = parseMotivo(m.motivo);

    if (!salesGrouped[pedId]) {
      salesGrouped[pedId] = {
        pedidoId: pedId,
        data: m.data,
        clienteNome,
        metodoPagamento,
        observacao,
        itens: [],
        valorTotalGeral: 0,
      };
    }

    salesGrouped[pedId].itens.push({
      sku: m.componenteSku,
      nome: m.componenteNome,
      quantidade: m.quantidade,
      valorTotal: m.valorTotal || 0,
    });

    salesGrouped[pedId].valorTotalGeral += m.valorTotal || 0;
  });

  const ordersList = Object.values(salesGrouped)
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  // Filter raw movements
  const filteredHistory = movimentacoes.filter(m => {
    let correspondeTipo = false;
    if (filtroTipo === 'todos') {
      correspondeTipo = true;
    } else if (filtroTipo === 'saida') {
      // "Baixas" should encompass all departures from inventory (manual write-offs and sales)
      correspondeTipo = m.tipo === 'saida' || m.tipo === 'venda';
    } else {
      correspondeTipo = m.tipo === filtroTipo;
    }
    if (!correspondeTipo) return false;

    if (!buscaTerm.trim()) return true;
    const term = buscaTerm.toLowerCase();
    const nomeMatches = m.componenteNome.toLowerCase().includes(term);
    const skuMatches = m.componenteSku.toLowerCase().includes(term);
    const pedidoIdMatches = m.pedidoId ? m.pedidoId.toLowerCase().includes(term) : false;
    const motivoMatches = m.motivo.toLowerCase().includes(term);

    return nomeMatches || skuMatches || pedidoIdMatches || motivoMatches;
  });

  // Filter grouped orders based on search term
  const filteredOrders = ordersList.filter(o => {
    if (!buscaTerm.trim()) return true;
    const term = buscaTerm.toLowerCase();
    const matchesId = o.pedidoId.toLowerCase().includes(term);
    const matchesClient = o.clienteNome.toLowerCase().includes(term);
    const matchesPayment = o.metodoPagamento.toLowerCase().includes(term);
    const matchesObs = o.observacao.toLowerCase().includes(term);
    const matchesItems = o.itens.some(i => i.nome.toLowerCase().includes(term) || i.sku.toLowerCase().includes(term));

    return matchesId || matchesClient || matchesPayment || matchesObs || matchesItems;
  });

  const getTipoEstilo = (tipo: TipoMovimentacao) => {
    switch (tipo) {
      case 'entrada':
        return {
          bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
          label: 'Lote de Entrada / Compra',
          icon: <CornerDownRight className="h-3 w-3" />,
        };
      case 'saida':
        return {
          bg: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
          label: 'Baixa Manual',
          icon: <CornerDownLeft className="h-3 w-3" />,
        };
      case 'venda':
        return {
          bg: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
          label: 'Faturamento de Venda',
          icon: <CornerDownLeft className="h-3 w-3" />,
        };
      case 'ajuste':
        return {
          bg: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
          label: 'Ajuste de Balanço',
          icon: <RefreshCw className="h-3 w-3" />,
        };
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3.5 id-transaction-history" id="transaction-history-logs">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-gray-100 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gray-100 text-[#1e293b] rounded">
            <History className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-850 uppercase tracking-wider">Histórico Geral & Faturamento</h3>
          </div>
        </div>

        {/* Action Toggle sub-tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => { setActiveSubTab('pedidos'); setBuscaTerm(''); }}
            className={`px-3 py-1 rounded text-[10.5px] font-bold uppercase transition duration-150 cursor-pointer ${
              activeSubTab === 'pedidos' 
                ? 'bg-[#1e293b] text-white shadow-2xs' 
                : 'text-slate-500 hover:text-slate-850'
            }`}
          >
            📋 Pedidos de Vendas ({ordersList.length})
          </button>
          <button
            type="button"
            onClick={() => { setActiveSubTab('movimentacoes'); setBuscaTerm(''); }}
            className={`px-3 py-1 rounded text-[10.5px] font-bold uppercase transition duration-150 cursor-pointer ${
              activeSubTab === 'movimentacoes' 
                ? 'bg-[#1e293b] text-white shadow-2xs' 
                : 'text-slate-500 hover:text-slate-850'
            }`}
          >
            ⚡ Fluxo de Estoque ({movimentacoes.length})
          </button>
        </div>

        {movimentacoes.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="flex items-center gap-1 text-[10px] font-black text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-150 px-2 py-1.5 rounded transition shrink-0 cursor-pointer uppercase tracking-wider font-mono self-end sm:self-auto"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Limpar Logs
          </button>
        )}
      </div>

      {/* FILTER SEARCH PANEL */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 bg-slate-50/70 p-3 rounded-lg border border-gray-150">
        
        {/* If show raw movements, offer categories filters */}
        {activeSubTab === 'movimentacoes' ? (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[9.5px] font-black text-gray-400 uppercase font-mono mr-1.5 flex items-center gap-1">
              <Filter className="h-2.5 w-2.5" />
              Operação:
            </span>
            <button
              onClick={() => setFiltroTipo('todos')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                filtroTipo === 'todos' ? 'bg-[#1e293b] text-white' : 'bg-gray-150 text-gray-650 hover:bg-gray-200'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFiltroTipo('entrada')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                filtroTipo === 'entrada' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Entradas
            </button>
            <button
              onClick={() => setFiltroTipo('saida')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                filtroTipo === 'saida' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Baixas
            </button>
            <button
              onClick={() => setFiltroTipo('venda')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                filtroTipo === 'venda' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-750 hover:bg-blue-100'
              }`}
            >
              Vendas
            </button>
            <button
              onClick={() => setFiltroTipo('ajuste')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                filtroTipo === 'ajuste' ? 'bg-amber-500 text-amber-950 font-black' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Ajustes
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-slate-655 font-bold">
            <span className="p-1 px-2.5 rounded bg-blue-50 border border-blue-200 text-[#1e293b] text-[10px] font-mono font-black uppercase">
              Relatório Comercial
            </span>
            <span className="text-[11px] text-gray-400 font-sans">
              Pedidos de Balcão e agrupados faturados no caixa.
            </span>
          </div>
        )}

        {/* UNIVERSAL SEARCH FIELD */}
        <div className="relative w-full lg:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <Search className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <input
            type="text"
            value={buscaTerm}
            onChange={(e) => setBuscaTerm(e.target.value)}
            placeholder={
              activeSubTab === 'pedidos' 
                ? "Buscar Nº Pedido, Cliente, SKU..." 
                : "Buscar item, SKU, observação..."
            }
            className="w-full bg-white border border-gray-205 rounded-md pl-8 pr-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400 font-sans shadow-2xs"
          />
        </div>
      </div>

      {/* RENDER ACTIVE VIEW */}
      {activeSubTab === 'pedidos' ? (
        /* ======================== pedidos mode (grouped orders cards) ======================== */
        filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-slate-400 border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
            <Receipt className="h-8 w-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
            <p className="text-xs font-bold uppercase text-slate-500 font-mono">Nenhum Pedido Localizado</p>
            <p className="text-[10px] text-gray-400 mt-0.5 max-w-xs mx-auto">
              Realize vendas rápidas ou feche compras usando o <strong>"Carrinho / PDV"</strong> para registrar pedidos!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map(order => {
              const formatadoData = new Date(order.data).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              });

              const isExpanded = !!expandedOrders[order.pedidoId];
              const totalItemsCount = order.itens.reduce((sum, i) => sum + i.quantidade, 0);

              return (
                <div 
                  key={order.pedidoId}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg shadow-2xs hover:shadow-xs overflow-hidden transition duration-150"
                  id={`order-invoice-card-${order.pedidoId}`}
                >
                  {/* Card Header row */}
                  <div 
                    onClick={() => toggleOrderExpand(order.pedidoId)}
                    className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 cursor-pointer hover:bg-slate-50 select-none transition"
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Order Number Badge */}
                      <span className="px-2.5 py-1 rounded bg-[#0f172a] text-emerald-400 text-xs font-mono font-black border border-slate-800 tracking-wider">
                        {order.pedidoId}
                      </span>

                      {/* Date & clock */}
                      <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {formatadoData}
                      </span>

                      {/* Customer tag */}
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-full">
                        <User className="h-2.5 w-2.5 text-slate-500" />
                        Cliente: <strong className="text-slate-900 font-bold">{order.clienteNome}</strong>
                      </span>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4">
                      {/* Payment Tag */}
                      <div className="text-right">
                        <span className="block text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest leading-none">PAGO VIA</span>
                        <span className="text-[10px] font-bold text-slate-600 font-sans">{order.metodoPagamento}</span>
                      </div>

                      {/* Total Amount in order */}
                      <div className="text-right bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded">
                        <span className="block text-[8px] font-mono font-bold text-emerald-700 uppercase tracking-widest leading-none">TOTAL DO PEDIDO</span>
                        <span className="text-xs font-black font-mono text-emerald-700">
                          R$ {order.valorTotalGeral.toFixed(2)}
                        </span>
                      </div>

                      {/* Toggle Collapse Button */}
                      <div className="p-1 rounded bg-slate-100 text-slate-550 border border-slate-205">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Collapsible itemized list block */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/20 p-3.5 space-y-2.5 animate-fade-in text-xs">
                      {/* Note description summary */}
                      {order.observacao && (
                        <div className="text-[10px] text-[#1e293b] font-medium bg-blue-50/45 p-2 rounded border border-blue-100 italic">
                          💡 <strong>Observação registrada:</strong> "{order.observacao}"
                        </div>
                      )}

                      {/* Table for items in the order */}
                      <div className="border border-gray-200 rounded bg-white overflow-hidden">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-200 text-[9px] font-bold text-gray-400 uppercase font-mono">
                              <th className="py-2 px-3">SKU</th>
                              <th className="py-2 px-3">Componente Eletrônico</th>
                              <th className="py-2 px-3 text-right">Qtd</th>
                              <th className="py-2 px-3 text-right">Preço Unitário</th>
                              <th className="py-2 px-3 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {order.itens.map((item, idx) => {
                              const unitPrice = item.valorTotal / item.quantidade;
                              return (
                                <tr key={idx} className="hover:bg-slate-50/30 font-sans">
                                  <td className="py-2 px-3 font-mono font-bold text-slate-500 uppercase">{item.sku}</td>
                                  <td className="py-2 px-3 font-semibold text-slate-800">{item.nome}</td>
                                  <td className="py-2 px-3 text-right font-mono text-slate-705 font-bold">{item.quantidade} un.</td>
                                  <td className="py-2 px-3 text-right font-mono text-gray-500">R$ {unitPrice.toFixed(2)}</td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-805">R$ {item.valorTotal.toFixed(2)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Small inline actions */}
                      <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                        <span>Total de componentes distintos no frete: {order.itens.length}</span>
                        <span>Total geral agrupado: {totalItemsCount} unidades</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ======================== raw movements mode ======================== */
        filteredHistory.length === 0 ? (
          <div className="py-12 text-center text-slate-400 border border-dashed border-gray-200 rounded bg-gray-50/50">
            <History className="h-5 w-5 mx-auto mb-1.5 opacity-35 text-slate-450" />
            <p className="text-[11px] font-bold uppercase text-slate-500">Nenhum registro encontrado</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Nenhuma movimentação corresponde aos critérios digitados no lóbulo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase font-mono">
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Componente / SKU</th>
                  <th className="py-2.5 px-3">Pedido Nº</th>
                  <th className="py-2.5 px-3">Ação</th>
                  <th className="py-2.5 px-3 text-right">Qtd</th>
                  <th className="py-2.5 px-3">Observação / Motivo</th>
                  <th className="py-2.5 px-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredHistory.map(m => {
                  const estilo = getTipoEstilo(m.tipo);
                  const formatadoData = new Date(m.data).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={m.id} className="hover:bg-gray-50/70 transition duration-150">
                      {/* Timestamp */}
                      <td className="py-2 px-3 whitespace-nowrap text-slate-405 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {formatadoData}
                        </div>
                      </td>

                      {/* Sku & Name */}
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-700 leading-tight select-all">{m.componenteNome}</div>
                        <div className="text-[10px] font-mono text-slate-400 leading-none mt-0.5 select-all">{m.componenteSku}</div>
                      </td>

                      {/* Pedido ID badge */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        {m.pedidoId ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200 font-black">
                            {m.pedidoId}
                          </span>
                        ) : (
                          <span className="text-[9.5px] font-mono text-gray-400 italic">Movimento manual</span>
                        )}
                      </td>

                      {/* Operation Type badge */}
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase border ${estilo.bg}`}>
                          {estilo.icon}
                          {estilo.label}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className={`py-2 px-3 text-right font-semibold font-mono ${
                        m.tipo === 'entrada' ? 'text-emerald-600' : 'text-slate-700'
                      }`}>
                        {m.tipo === 'entrada' ? '+' : '-'}{m.quantidade} un.
                      </td>

                      {/* Reason */}
                      <td className="py-2 px-3 max-w-[200px] text-slate-500 italic truncate" title={m.motivo}>
                        {m.motivo}
                      </td>

                      {/* Price subtotal */}
                      <td className="py-2 px-3 text-right font-mono text-slate-600 font-semibold">
                        {m.valorTotal ? `R$ ${m.valorTotal.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
