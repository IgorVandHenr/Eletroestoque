/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ComponenteEletronico } from '../types';
import { TriangleAlert, AlertCircle, ShoppingCart, Copy, Check, FileDown, RefreshCw } from 'lucide-react';

interface AlertBannerProps {
  components: ComponenteEletronico[];
  onRestockQuick: (id: string, qtyToAdd: number) => void;
}

export default function AlertBanner({ components, onRestockQuick }: AlertBannerProps) {
  const [copied, setCopied] = useState(false);
  const [customRestockQty, setCustomRestockQty] = useState<{ [id: string]: number }>({});

  const lowStockItems = components.filter(c => c.quantidade <= c.minimoEstoque);
  const outOfStockItems = lowStockItems.filter(c => c.quantidade === 0);
  const warningItems = lowStockItems.filter(c => c.quantidade > 0);

  if (lowStockItems.length === 0) {
    return (
      <div className="bg-emerald-500/5 border border-emerald-500/20 text-emerald-700 p-4 rounded-2xl flex items-center gap-3 id-alert-banner-empty" id="alert-banner-empty">
        <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
          <Check className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-sm font-semibold">Tudo Seguro!</h4>
          <p className="text-xs text-emerald-600/90">Todos os componentes eletrônicos estão com níveis de estoque acima do limite mínimo de segurança.</p>
        </div>
      </div>
    );
  }

  // Generate automated purchase list text
  const generateRestockListText = () => {
    let text = `📦 ORÇAMENTO DE REPOSIÇÃO - ELETROESTOQUE 📦\n`;
    text += `Gerado em: ${new Date().toLocaleDateString('pt-BR')}\n`;
    text += `==================================================\n\n`;

    let totalCustoEstimado = 0;

    lowStockItems.forEach((item, index) => {
      const qtdNecessaria = Math.max(10, item.minimoEstoque * 2 - item.quantidade);
      const custoEstimado = qtdNecessaria * item.valorCompra;
      totalCustoEstimado += custoEstimado;

      text += `${index + 1}. [${item.sku}] ${item.nome}\n`;
      text += `   - Status: ${item.quantidade === 0 ? '❌ ESGOTADO' : '⚠️ ESTOQUE CRÍTICO'} (${item.quantidade}/${item.minimoEstoque} un.)\n`;
      text += `   - Sugestão de Reposição: comprar +${qtdNecessaria} unidades\n`;
      text += `   - Custo Unitário de Compra: R$ ${item.valorCompra.toFixed(2)}\n`;
      text += `   - Custo Subtotal Estimado: R$ ${custoEstimado.toFixed(2)}\n\n`;
    });

    text += `==================================================\n`;
    text += `TOTAL DE COMPONENTES NECESSITANDO REPOSIÇÃO: ${lowStockItems.length}\n`;
    text += `ESTIMATIVA DE INVESTIMENTO TOTAL: R$ ${totalCustoEstimado.toFixed(2)}\n`;
    text += `==================================================\n`;
    text += `Aprovado por: ________________________________\n`;
    return text;
  };

  const handleCopyToClipboard = () => {
    const text = generateRestockListText();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-3 id-alert-banner" id="low-stock-alert-section">
      {/* Primary Indicator */}
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-red-500/20 text-red-650 rounded shrink-0">
            <TriangleAlert className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-red-800 uppercase tracking-wide">
              Reposição Requerida ({lowStockItems.length} componente{lowStockItems.length > 1 ? 's' : ''} em baixa)
            </h4>
            <p className="text-[11px] text-red-700 leading-normal">
              Temos <strong className="text-red-800">{outOfStockItems.length} itens esgotados</strong> e{' '}
              <strong>{warningItems.length} itens abaixo da margem de segurança</strong>.
            </p>
          </div>
        </div>

        {/* Generate order button */}
        <button
          type="button"
          onClick={handleCopyToClipboard}
          className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-bold text-red-800 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 transition duration-150 cursor-pointer self-start md:self-center"
        >
          {copied ? <Check className="h-3 w-3 text-green-700" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copiada!' : 'Copiar Lista de Compras'}
        </button>
      </div>

      {/* Mini warning list */}
      <div className="bg-gray-100 border border-gray-200 rounded-lg p-3">
        <span className="block text-[10px] font-bold text-gray-500 uppercase font-mono tracking-wider mb-2">Componentes para reposição</span>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {lowStockItems.map(item => {
            const isZero = item.quantidade === 0;
            const suggestedQty = Math.max(10, item.minimoEstoque * 2 - item.quantidade);
            const key = item.id;
            const restockVal = customRestockQty[key] || suggestedQty;

            return (
              <div
                key={item.id}
                className={`p-2.5 rounded-lg border flex flex-col justify-between gap-2 bg-white shadow-xs ${
                  isZero ? 'border-red-200 bg-red-50/20' : 'border-gray-200'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center gap-1">
                    <span className="text-[9px] font-mono bg-slate-100 text-slate-500 px-1 py-0.2 rounded border border-slate-200 truncate max-w-[120px]">
                      {item.sku}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 rounded ${
                        isZero ? 'bg-red-600 text-white' : 'bg-yellow-400 text-yellow-900'
                      }`}
                    >
                      {isZero ? 'Esgotado' : 'Alerta'}
                    </span>
                  </div>

                  <h5 className="text-[11px] font-bold text-slate-800 mt-1 line-clamp-1 truncate">{item.nome}</h5>

                  <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                    <span>Estoque Atual:</span>
                    <span className={`font-mono font-bold ${isZero ? 'text-red-650' : 'text-slate-800'}`}>
                      {item.quantidade} / {item.minimoEstoque} un.
                    </span>
                  </div>

                  {item.localizacao && (
                    <div className="text-[10px] text-slate-400 font-mono flex justify-between">
                      <span>Posição:</span>
                      <span className="text-slate-650 truncate max-w-[100px]">{item.localizacao}</span>
                    </div>
                  )}
                </div>

                {/* Restocking adjustment widget */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-gray-500">Comprar +</span>
                    <input
                      type="number"
                      min="1"
                      className="w-10 px-1 py-0.5 rounded text-[10px] font-mono text-center border border-gray-300"
                      value={restockVal}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 1;
                        setCustomRestockQty(prev => ({ ...prev, [key]: Math.max(1, val) }));
                      }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      onRestockQuick(item.id, restockVal);
                      // reset display default values
                      setCustomRestockQty(prev => {
                        const next = { ...prev };
                        delete next[key];
                        return next;
                      });
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-white bg-blue-600 rounded hover:bg-blue-700 cursor-pointer active:scale-95 transition-all"
                  >
                    <ShoppingCart className="h-2.5 w-2.5" />
                    Comprar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
