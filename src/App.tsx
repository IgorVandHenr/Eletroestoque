/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ComponenteEletronico, MovimentacaoEstoque, CategoriaConfig } from './types';
import { COMPONENTES_INICIAIS, CATEGORIAS_PADRAO } from './data/defaultComponents';
import MetricCard from './components/MetricCard';
import ComponentForm from './components/ComponentForm';
import AlertBanner from './components/AlertBanner';
import TransactionHistory from './components/TransactionHistory';

// Import essential icons from Lucide-React
import { 
  Plus, 
  Search, 
  RotateCcw, 
  SlidersHorizontal, 
  ArrowUpDown, 
  Trash2, 
  Edit2, 
  ShoppingCart, 
  Package, 
  X, 
  Boxes, 
  BookOpen, 
  PlusCircle, 
  MinusCircle, 
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  FileSpreadsheet,
  Database,
  RefreshCw,
  Copy,
  Check,
  Cloud,
  CloudOff
} from 'lucide-react';

import {
  getSupabaseConfig,
  saveSupabaseConfig,
  getSupabaseClient,
  dbFetchComponents,
  dbFetchHistory,
  dbUpsertComponent,
  dbDeleteComponent,
  dbInsertHistoryItem,
  dbClearHistory,
  syncLocalDataToSupabase,
  SUPABASE_SQL_SETUP
} from './lib/supabase';

const LOCAL_STORAGE_KEY_COMP = 'eletro_estoque_componentes_v2';
const LOCAL_STORAGE_KEY_HIST = 'eletro_estoque_historico_v2';

export default function App() {
  // --- States ---
  const [components, setComponents] = useState<ComponenteEletronico[]>([]);
  const [history, setHistory] = useState<MovimentacaoEstoque[]>([]);
  
  // UI and Forms layout
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [componentToEdit, setComponentToEdit] = useState<ComponenteEletronico | null>(null);
  const [activeTab, setActiveTab] = useState<'estoque' | 'historico' | 'carrinho'>('estoque');
  
  // Shopping Cart / Point of Sale (Carrinho / PDV) States
  const [cart, setCart] = useState<{ componentId: string; quantidade: number }[]>([]);
  const [checkoutForm, setCheckoutForm] = useState({
    clienteNome: '',
    metodoPagamento: 'PIX',
    observacao: ''
  });
  
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'baixo' | 'esgotado' | 'normal'>('todos');
  
  // Sorting
  const [sortField, setSortField] = useState<keyof ComponenteEletronico | 'lucro'>('nome');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Quick action states
  const [localFeedback, setLocalFeedback] = useState<{ message: string; type: 'success' | 'error' | null }>({
    message: '',
    type: null
  });

  // Supabase Integration States
  const [supabaseConfig, setSupabaseConfig] = useState<{ url: string; anonKey: string; enabled: boolean }>({
    url: '',
    anonKey: '',
    enabled: false
  });
  const [isSupabasePanelOpen, setIsSupabasePanelOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // States for detailed purchase entry modal (replenishment / compra)
  const [restockItem, setRestockItem] = useState<ComponenteEletronico | null>(null);
  const [restockForm, setRestockForm] = useState({
    quantidade: 1,
    valorCompra: 0,
    dataEntrada: '',
    motivo: '',
    atualizarCadastro: true
  });

  // --- Initial loading from LocalStorage or Supabase ---
  useEffect(() => {
    const config = getSupabaseConfig();
    setSupabaseConfig(config);

    const loadInitialData = async () => {
      if (config.enabled && config.url && config.anonKey) {
        setIsSyncing(true);
        setSupabaseError(null);
        try {
          const dbComps = await dbFetchComponents();
          const dbHist = await dbFetchHistory();
          
          setComponents(dbComps);
          setHistory(dbHist);
          
          // Cache locally
          localStorage.setItem(LOCAL_STORAGE_KEY_COMP, JSON.stringify(dbComps));
          localStorage.setItem(LOCAL_STORAGE_KEY_HIST, JSON.stringify(dbHist));
          triggerFeedback('Sincronizado em tempo real com o Supabase!', 'success');
        } catch (err: any) {
          console.error('Erro ao ler do Supabase na inicialização:', err);
          setSupabaseError(err.message || 'Erro de conexão ou tabelas ausentes');
          triggerFeedback('Erro ao conectar ao Supabase (verifique painel). Carregando backup offline.', 'error');
          loadDataFromLocalStorage();
        } finally {
          setIsSyncing(false);
        }
      } else {
        loadDataFromLocalStorage();
      }
    };

    loadInitialData();
  }, []);

  const loadDataFromLocalStorage = () => {
    const savedComponents = localStorage.getItem(LOCAL_STORAGE_KEY_COMP);
    const savedHistory = localStorage.getItem(LOCAL_STORAGE_KEY_HIST);

    if (savedComponents) {
      try {
        setComponents(JSON.parse(savedComponents));
      } catch (e) {
        setComponents(COMPONENTES_INICIAIS);
      }
    } else {
      setComponents(COMPONENTES_INICIAIS);
    }

    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        setHistory(semeandoHistoricoPadrao());
      }
    } else {
      setHistory(semeandoHistoricoPadrao());
    }
  };

  // --- Persistent Auto-Saving ---
  const saveToLocalStorage = (newComp: ComponenteEletronico[], newHist: MovimentacaoEstoque[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY_COMP, JSON.stringify(newComp));
    localStorage.setItem(LOCAL_STORAGE_KEY_HIST, JSON.stringify(newHist));
  };

  // Seed default history matching pre-populated items
  const semeandoHistoricoPadrao = (): MovimentacaoEstoque[] => {
    return [
      {
        id: 'hist_init',
        componenteId: 'comp_1',
        componenteNome: 'Placa Uno R3 Integrada Atmega328P',
        componenteSku: 'ARD-UNO-R3',
        tipo: 'entrada',
        quantidade: 10,
        data: '2026-05-20T10:00:00Z',
        motivo: 'Carga inicial do inventário da loja física',
        valorTotal: 380.00
      },
      {
        id: 'hist_venda_1',
        componenteId: 'comp_1',
        componenteNome: 'Placa Uno R3 Integrada Atmega328P',
        componenteSku: 'ARD-UNO-R3',
        tipo: 'venda',
        quantidade: 6,
        data: '2026-05-28T14:30:00Z',
        motivo: 'Venda de Balcão - Kit Robótica Aluno',
        valorTotal: 419.40
      },
      {
        id: 'hist_rele_init',
        componenteId: 'comp_5',
        componenteNome: 'Módulo Relé 5V 1 Canal com Optoacoplador',
        componenteSku: 'MOD-RELE-5V-1C',
        tipo: 'entrada',
        quantidade: 5,
        data: '2026-05-22T08:30:00Z',
        motivo: 'Entrada parcial fornecedor MakerHero',
        valorTotal: 24.00
      },
      {
        id: 'hist_venda_2',
        componenteId: 'comp_5',
        componenteNome: 'Módulo Relé 5V 1 Canal com Optoacoplador',
        componenteSku: 'MOD-RELE-5V-1C',
        tipo: 'venda',
        quantidade: 5,
        data: '2026-05-28T18:22:00Z',
        motivo: 'Venda de Balcão [Cliente Retirada ESP32]',
        valorTotal: 59.50
      }
    ];
  };

  // Trigger feedback banner
  const triggerFeedback = (message: string, type: 'success' | 'error') => {
    setLocalFeedback({ message, type });
    setTimeout(() => {
      setLocalFeedback({ message: '', type: null });
    }, 4500);
  };

  // --- Core CRUD Handlers ---

  // SAVE or UPDATE (with exact unique check)
  const handleSaveComponent = async (formData: Omit<ComponenteEletronico, 'id' | 'criadoEm' | 'atualizadoEm'> & { id?: string }) => {
    const isEdit = !!formData.id;
    const now = new Date().toISOString();

    // Secondary duplicate guard in parent state to avoid manual script bypass
    const lowerNome = formData.nome.trim().toLowerCase();
    const upperSku = formData.sku.trim().toUpperCase();

    const isNomeDuplicate = components.some(
      c => (!isEdit || c.id !== formData.id) && c.nome.toLowerCase().trim() === lowerNome
    );
    const isSkuDuplicate = components.some(
      c => (!isEdit || c.id !== formData.id) && c.sku.toUpperCase().trim() === upperSku
    );

    if (isNomeDuplicate) {
      triggerFeedback('Falha: Já existe um componente registrado com este Nome exato.', 'error');
      return;
    }
    if (isSkuDuplicate) {
      triggerFeedback('Falha: Já existe um componente registrado com este SKU exato.', 'error');
      return;
    }

    let updatedComponents: ComponenteEletronico[] = [];
    let updatedHistory: MovimentacaoEstoque[] = [...history];
    let addedOrUpdatedComp: ComponenteEletronico | null = null;
    let newLog: MovimentacaoEstoque | null = null;

    if (isEdit && formData.id) {
      // Find previous to log differences in quantity
      const original = components.find(c => c.id === formData.id);
      const prevQty = original ? original.quantidade : 0;
      const difference = formData.quantidade - prevQty;

      addedOrUpdatedComp = {
        ...original,
        ...formData,
        sku: upperSku,
        atualizadoEm: now
      } as ComponenteEletronico;

      updatedComponents = components.map(c => {
        if (c.id === formData.id) {
          return addedOrUpdatedComp!;
        }
        return c;
      });

      // Log movement if qty changed
      if (difference !== 0) {
        const histType = difference > 0 ? 'entrada' : 'saida';
        const absDiff = Math.abs(difference);
        const subtotal = absDiff * (difference > 0 ? formData.valorCompra : formData.valorVenda);

        newLog = {
          id: `log_${Date.now()}`,
          componenteId: formData.id,
          componenteNome: formData.nome,
          componenteSku: upperSku,
          tipo: histType,
          quantidade: absDiff,
          data: now,
          motivo: `Edição de estoque (Anterior: ${prevQty} un. -> Atual: ${formData.quantidade} un.)`,
          valorTotal: Number(subtotal.toFixed(2))
        };
        updatedHistory = [newLog, ...updatedHistory];
      }

      triggerFeedback('Componente atualizado com sucesso!', 'success');
    } else {
      // Create new component
      const newId = `comp_${Date.now()}`;
      addedOrUpdatedComp = {
        id: newId,
        nome: formData.nome,
        sku: upperSku,
        categoria: formData.categoria,
        quantidade: formData.quantidade,
        valorCompra: formData.valorCompra,
        valorVenda: formData.valorVenda,
        minimoEstoque: formData.minimoEstoque,
        localizacao: formData.localizacao,
        descricao: formData.descricao,
        criadoEm: now,
        atualizadoEm: now
      };

      updatedComponents = [addedOrUpdatedComp, ...components];

      // Log creation entry if quantity started above zero
      if (formData.quantidade > 0) {
        newLog = {
          id: `log_${Date.now()}`,
          componenteId: newId,
          componenteNome: formData.nome,
          componenteSku: upperSku,
          tipo: 'entrada',
          quantidade: formData.quantidade,
          data: now,
          motivo: 'Carga inicial durante o cadastro do componente',
          valorTotal: Number((formData.quantidade * formData.valorCompra).toFixed(2))
        };
        updatedHistory = [newLog, ...updatedHistory];
      }

      triggerFeedback('Componente cadastrado com sucesso no estoque!', 'success');
    }

    setComponents(updatedComponents);
    setHistory(updatedHistory);
    saveToLocalStorage(updatedComponents, updatedHistory);
    setIsFormOpen(false);
    setComponentToEdit(null);

    // Sync to Supabase in real-time
    if (supabaseConfig.enabled && addedOrUpdatedComp) {
      setIsSyncing(true);
      try {
        await dbUpsertComponent(addedOrUpdatedComp);
        if (newLog) {
          await dbInsertHistoryItem(newLog);
        }
      } catch (err: any) {
        console.error('Erro de sincronização com Supabase:', err);
        triggerFeedback(`Salvo localmente, mas erro no Supabase: ${err.message}`, 'error');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // DELETE component handler
  const handleDeleteComponent = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o componente "${name}" permanentemente do estoque?`)) {
      const updatedComponents = components.filter(c => c.id !== id);
      const now = new Date().toISOString();
      const target = components.find(c => c.id === id);

      const newLog: MovimentacaoEstoque = {
        id: `log_${Date.now()}`,
        componenteId: id,
        componenteNome: name,
        componenteSku: target?.sku || 'N/A',
        tipo: 'saida',
        quantidade: target?.quantidade || 0,
        data: now,
        motivo: 'Exclusão definitiva permanente do componente físico'
      };

      const updatedHistory = [newLog, ...history];
      setComponents(updatedComponents);
      setHistory(updatedHistory);
      saveToLocalStorage(updatedComponents, updatedHistory);
      triggerFeedback(`Componente "${name}" foi removido do estoque.`, 'success');

      if (supabaseConfig.enabled) {
        setIsSyncing(true);
        try {
          await dbDeleteComponent(id);
          await dbInsertHistoryItem(newLog);
        } catch (err: any) {
          console.error(err);
          triggerFeedback(`Excluído localmente. Erro no Supabase: ${err.message}`, 'error');
        } finally {
          setIsSyncing(false);
        }
      }
    }
  };

  // QUICK SALE (venda) click handler
  const handleQuickSale = async (id: string, count: number = 1) => {
    const item = components.find(c => c.id === id);
    if (!item) return;

    if (item.quantidade < count) {
      triggerFeedback(`Estoque insuficiente de ${item.nome}! Disponível: ${item.quantidade} unidades.`, 'error');
      return;
    }

    const now = new Date().toISOString();
    const updatedItem = { ...item, quantidade: item.quantidade - count, atualizadoEm: now };
    const updatedComponents = components.map(c => {
      if (c.id === id) {
        return updatedItem;
      }
      return c;
    });

    const subtotal = count * item.valorVenda;
    const orderNumber = `PED-${Math.floor(100000 + Math.random() * 900000)}`;
    const newLog: MovimentacaoEstoque = {
      id: `log_${Date.now()}`,
      pedidoId: orderNumber,
      componenteId: id,
      componenteNome: item.nome,
      componenteSku: item.sku,
      tipo: 'venda',
      quantidade: count,
      data: now,
      motivo: `Venda rápida no balcão de atendimento`,
      valorTotal: Number(subtotal.toFixed(2))
    };

    const updatedHistory = [newLog, ...history];
    setComponents(updatedComponents);
    setHistory(updatedHistory);
    saveToLocalStorage(updatedComponents, updatedHistory);
    triggerFeedback(`Venda de x${count} "${item.nome}" registrada! Pedido: ${orderNumber}`, 'success');

    if (supabaseConfig.enabled) {
      setIsSyncing(true);
      try {
        await dbUpsertComponent(updatedItem);
        await dbInsertHistoryItem(newLog);
      } catch (err: any) {
        console.error(err);
        triggerFeedback(`Venda local registrada. Erro no Supabase: ${err.message}`, 'error');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Open detailed purchase/restock modal (compra/reposição)
  const handleOpenRestockModal = (id: string, initialCount: number = 1) => {
    const item = components.find(c => c.id === id);
    if (!item) return;

    const todayLocal = new Date();
    // Format to YYYY-MM-DD in local time
    const offset = todayLocal.getTimezoneOffset();
    const localDate = new Date(todayLocal.getTime() - (offset * 60 * 1000));
    const todayStr = localDate.toISOString().split('T')[0];

    setRestockItem(item);
    setRestockForm({
      quantidade: initialCount,
      valorCompra: item.valorCompra,
      dataEntrada: todayStr,
      motivo: `Compra de reposição autorizada`,
      atualizarCadastro: true
    });
  };

  // Confirm and record the detailed purchase (regista preço de compra e data de entrada customizados)
  const handleConfirmRestock = async () => {
    if (!restockItem) return;
    const { quantidade, valorCompra, dataEntrada, motivo, atualizarCadastro } = restockForm;

    if (quantidade <= 0) {
      triggerFeedback('A quantidade de reposição deve ser maior que zero.', 'error');
      return;
    }
    if (valorCompra < 0) {
      triggerFeedback('O preço de compra não pode ser negativo.', 'error');
      return;
    }

    let isoDate = new Date().toISOString();
    if (dataEntrada) {
      try {
        const selectedDate = new Date(dataEntrada + "T12:00:00");
        isoDate = selectedDate.toISOString();
      } catch (e) {
        console.error("Erro ao formatar data:", e);
      }
    }

    const updatedItem = {
      ...restockItem,
      quantidade: restockItem.quantidade + quantidade,
      valorCompra: atualizarCadastro ? valorCompra : restockItem.valorCompra,
      atualizadoEm: new Date().toISOString()
    };

    const updatedComponents = components.map(c => {
      if (c.id === restockItem.id) {
        return updatedItem;
      }
      return c;
    });

    const subtotal = quantidade * valorCompra;
    const newLog: MovimentacaoEstoque = {
      id: `log_${Date.now()}`,
      componenteId: restockItem.id,
      componenteNome: restockItem.nome,
      componenteSku: restockItem.sku,
      tipo: 'entrada',
      quantidade,
      data: isoDate,
      motivo: motivo || `Reposição de lote (Custo: R$ ${valorCompra.toFixed(2)}/un)`,
      valorTotal: Number(subtotal.toFixed(2))
    };

    const updatedHistory = [newLog, ...history];
    setComponents(updatedComponents);
    setHistory(updatedHistory);
    saveToLocalStorage(updatedComponents, updatedHistory);
    setRestockItem(null); // Close modal
    triggerFeedback(`Estoque de "${restockItem.nome}" reabastecido (+${quantidade} un.) com sucesso!`, 'success');

    if (supabaseConfig.enabled) {
      setIsSyncing(true);
      try {
        await dbUpsertComponent(updatedItem);
        await dbInsertHistoryItem(newLog);
      } catch (err: any) {
        console.error(err);
        triggerFeedback(`Lançado localmente. Erro no Supabase: ${err.message}`, 'error');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // QUICK RESTOCK (increment) from alerts panel or main rows - now launches details modal
  const handleQuickRestock = async (id: string, count: number) => {
    handleOpenRestockModal(id, count);
  };

  // --- Shopping Cart / Point of Sale (Carrinho / PDV) Logic ---
  const handleAddToCart = (id: string) => {
    const component = components.find(c => c.id === id);
    if (!component) return;

    if (component.quantidade <= 0) {
      triggerFeedback(`O componente "${component.nome}" está esgotado no estoque!`, 'error');
      return;
    }

    const cartItem = cart.find(item => item.componentId === id);
    const qtyInCart = cartItem ? cartItem.quantidade : 0;

    if (qtyInCart >= component.quantidade) {
      triggerFeedback(`Não há mais unidades disponíveis de "${component.nome}" (estoque máximo: ${component.quantidade}).`, 'error');
      return;
    }

    let updatedCart;
    if (cartItem) {
      updatedCart = cart.map(item =>
        item.componentId === id ? { ...item, quantidade: item.quantidade + 1 } : item
      );
    } else {
      updatedCart = [...cart, { componentId: id, quantidade: 1 }];
    }

    setCart(updatedCart);
    triggerFeedback(`"${component.nome}" adicionado ao carrinho!`, 'success');
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(cart.filter(item => item.componentId !== id));
    triggerFeedback('Componente removido do carrinho.', 'success');
  };

  const handleUpdateCartQty = (id: string, qty: number) => {
    const component = components.find(c => c.id === id);
    if (!component) return;

    if (qty <= 0) {
      handleRemoveFromCart(id);
      return;
    }

    if (qty > component.quantidade) {
      triggerFeedback(`Quantidade corrigida para o estoque máximo disponível de "${component.nome}" (${component.quantidade} un.).`, 'error');
      qty = component.quantidade;
    }

    setCart(cart.map(item =>
      item.componentId === id ? { ...item, quantidade: qty } : item
    ));
  };

  const handleClearCart = () => {
    setCart([]);
    triggerFeedback('Todos os itens do carrinho foram removidos.', 'success');
  };

  const handleCheckoutCart = async () => {
    if (cart.length === 0) {
      triggerFeedback('Adicione componentes ao carrinho primeiro!', 'error');
      return;
    }

    // Verify stock availability
    for (const cartItem of cart) {
      const comp = components.find(c => c.id === cartItem.componentId);
      if (!comp) {
        triggerFeedback('Um dos componentes do carrinho não foi localizado no estoque.', 'error');
        return;
      }
      if (comp.quantidade < cartItem.quantidade) {
        triggerFeedback(`Estoque insuficiente para "${comp.nome}"! Disponível: ${comp.quantidade} un.`, 'error');
        return;
      }
    }

    const nowStr = new Date().toISOString();
    const newLogs: MovimentacaoEstoque[] = [];
    const orderNumber = `PED-${Math.floor(100000 + Math.random() * 900000)}`;

    const updatedComponents = components.map(c => {
      const cartItem = cart.find(item => item.componentId === c.id);
      if (cartItem) {
        const subtotal = cartItem.quantidade * c.valorVenda;
        const note = `Venda PDV - Cliente: ${checkoutForm.clienteNome || 'Consumidor Final'} | Pagamento: ${checkoutForm.metodoPagamento}${checkoutForm.observacao ? ` | Obs: ${checkoutForm.observacao}` : ''}`;
        
        const newLog: MovimentacaoEstoque = {
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          pedidoId: orderNumber,
          componenteId: c.id,
          componenteNome: c.nome,
          componenteSku: c.sku,
          tipo: 'venda',
          quantidade: cartItem.quantidade,
          data: nowStr,
          motivo: note,
          valorTotal: Number(subtotal.toFixed(2))
        };
        newLogs.push(newLog);

        return {
          ...c,
          quantidade: c.quantidade - cartItem.quantidade,
          atualizadoEm: nowStr
        };
      }
      return c;
    });

    const updatedHistory = [...newLogs, ...history];
    setComponents(updatedComponents);
    setHistory(updatedHistory);
    saveToLocalStorage(updatedComponents, updatedHistory);
    setCart([]);
    setCheckoutForm({ clienteNome: '', metodoPagamento: 'PIX', observacao: '' });
    setActiveTab('historico');
    triggerFeedback(`Venda de ${newLogs.length} item(ns) faturada! Pedido: ${orderNumber}`, 'success');

    if (supabaseConfig.enabled) {
      setIsSyncing(true);
      try {
        for (const logItem of newLogs) {
          const compToSync = updatedComponents.find(c => c.id === logItem.componenteId);
          if (compToSync) {
            await dbUpsertComponent(compToSync);
          }
          await dbInsertHistoryItem(logItem);
        }
        setSupabaseError(null);
      } catch (err: any) {
        console.error(err);
        triggerFeedback(`Saída registrada offline. Erro ao salvar na nuvem Supabase: ${err.message}`, 'error');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Clear log history
  const handleClearHistory = async () => {
    if (window.confirm('Aviso: Isso irá limpar todo o histórico de transações. Os estoques atuais não serão alterados. Continuar?')) {
      setHistory([]);
      localStorage.setItem(LOCAL_STORAGE_KEY_HIST, JSON.stringify([]));
      triggerFeedback('Histórico de movimentações limpo.', 'success');

      if (supabaseConfig.enabled) {
        setIsSyncing(true);
        try {
          await dbClearHistory();
        } catch (err: any) {
          console.error(err);
          triggerFeedback(`Histórico local limpo. Erro no Supabase: ${err.message}`, 'error');
        } finally {
          setIsSyncing(false);
        }
      }
    }
  };

  // Reset entire system to standard mock database
  const handleResetDatabase = async () => {
    if (window.confirm('Tem certeza de que deseja resetar TODOS os dados? Suas alterações serão perdidas e o sistema voltará aos componentes padrão do Arduino.')) {
      setComponents(COMPONENTES_INICIAIS);
      const defaultHist = semeandoHistoricoPadrao();
      setHistory(defaultHist);
      localStorage.setItem(LOCAL_STORAGE_KEY_COMP, JSON.stringify(COMPONENTES_INICIAIS));
      localStorage.setItem(LOCAL_STORAGE_KEY_HIST, JSON.stringify(defaultHist));
      setIsFormOpen(false);
      setComponentToEdit(null);
      triggerFeedback('Planilha de estoque restaurada para o padrão inicial!', 'success');

      if (supabaseConfig.enabled) {
        setIsSyncing(true);
        try {
          await dbClearHistory();
          await syncLocalDataToSupabase(COMPONENTES_INICIAIS, defaultHist);
          triggerFeedback('Banco Cloud do Supabase redefinido para o padrão!', 'success');
        } catch (err: any) {
          console.error(err);
          triggerFeedback(`Local restaurado. Erro ao sincronizar Supabase: ${err.message}`, 'error');
        } finally {
          setIsSyncing(false);
        }
      }
    }
  };


  // --- Calculations ---
  const totalItensUnicos = components.length;
  const totalUnidadesInEstoque = components.reduce((acc, curr) => acc + curr.quantidade, 0);
  
  // Total costs and margins based on current inventory quantities
  const totalBuyingCost = components.reduce((acc, curr) => acc + (curr.quantidade * curr.valorCompra), 0);
  const totalExpectedRevenue = components.reduce((acc, curr) => acc + (curr.quantidade * curr.valorVenda), 0);
  const totalPotentialProfit = totalExpectedRevenue - totalBuyingCost;

  // Alerts counters
  const totalEstoqueBaixoAlerts = components.filter(c => c.quantidade <= c.minimoEstoque).length;
  const totalEsgotadoAlerts = components.filter(c => c.quantidade === 0).length;

  // --- Filtering & Sorting execution ---
  const handleHeaderSort = (field: keyof ComponenteEletronico | 'lucro') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const processedComponents = components
    .filter(c => {
      // Search Box text (Checks Name or SKU code)
      const cleanSearch = searchTerm.toLowerCase().trim();
      if (cleanSearch) {
        return c.nome.toLowerCase().includes(cleanSearch) || c.sku.toLowerCase().includes(cleanSearch);
      }
      return true;
    })
    .filter(c => {
      // Category selection dropdown
      if (selectedCategory === 'todas') return true;
      return c.categoria === selectedCategory;
    })
    .filter(c => {
      // Stock Status button switcher
      if (statusFilter === 'todos') return true;
      if (statusFilter === 'baixo') return c.quantidade <= c.minimoEstoque;
      if (statusFilter === 'esgotado') return c.quantidade === 0;
      if (statusFilter === 'normal') return c.quantidade > c.minimoEstoque;
      return true;
    })
    .sort((a, b) => {
      // Calculate derived fields if needed
      let valueA: any;
      let valueB: any;

      if (sortField === 'lucro') {
        valueA = a.valorVenda - a.valorCompra;
        valueB = b.valorVenda - b.valorCompra;
      } else {
        valueA = a[sortField as keyof ComponenteEletronico];
        valueB = b[sortField as keyof ComponenteEletronico];
      }

      // Handle strings comparison beautifully
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortDirection === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
      }

      // Compare numbers
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      }

      return 0;
    });

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-800 font-sans text-xs flex flex-col" id="app-root-container">
      {/* Dynamic Action notifications */}
      {localFeedback.message && (
        <div className={`fixed top-4 right-4 z-100 flex items-center gap-2 px-3 py-2 rounded shadow-lg border text-xs transition-all duration-300 ${
          localFeedback.type === 'success' 
            ? 'bg-emerald-600 text-white border-emerald-700' 
            : 'bg-red-600 text-white border-red-700'
        }`} id="app-toast-alert">
          {localFeedback.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span className="font-bold uppercase tracking-wider">{localFeedback.message}</span>
          <button 
            type="button"
            onClick={() => setLocalFeedback({ message: '', type: null })}
            className="ml-2 hover:opacity-85 text-white cursor-pointer"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Detailed Stock Replenishment / Purchase Dialog Modal */}
      {restockItem && (
        <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in" id="detailed-restock-modal">
          <div className="bg-[#1e293b] border border-slate-700 text-slate-100 rounded-xl max-w-md w-full flex flex-col shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="px-5 py-4 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-widest font-mono text-emerald-400">
                  Registrar Entrada / Compra
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRestockItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              <div className="bg-slate-900/60 p-3.5 rounded border border-slate-800 text-[11px] leading-relaxed space-y-1">
                <p className="text-slate-400">Item selecionado para entrada de lote:</p>
                <h4 className="text-white font-bold leading-tight font-sans text-xs">
                  [{restockItem.sku}] {restockItem.nome}
                </h4>
                <div className="flex justify-between text-[10px] text-slate-400 pt-1 font-mono">
                  <span>Estoque atual: {restockItem.quantidade} un.</span>
                  <span>Custo atual de compra: R$ {restockItem.valorCompra.toFixed(2)}</span>
                </div>
              </div>

              {/* Form Input fields */}
              <div className="space-y-3 text-xs">
                {/* Quantity & Unit Price in two columns */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                      Qtd de Entrada *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={restockForm.quantidade}
                      onChange={(e) => setRestockForm({ ...restockForm, quantidade: Math.max(1, parseInt(e.target.value) || 0) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                      Preço de Compra Unitário (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={restockForm.valorCompra}
                      onChange={(e) => setRestockForm({ ...restockForm, valorCompra: Math.max(0, parseFloat(e.target.value) || 0) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                {/* Entry Date */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                    Data de Entrada no Estoque *
                  </label>
                  <input
                    type="date"
                    required
                    value={restockForm.dataEntrada}
                    onChange={(e) => setRestockForm({ ...restockForm, dataEntrada: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                {/* Reason description */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                    Motivo / Descrição da Entrada
                  </label>
                  <input
                    type="text"
                    value={restockForm.motivo}
                    onChange={(e) => setRestockForm({ ...restockForm, motivo: e.target.value })}
                    placeholder="Ex: Compra com NF-e 1234, fornecedor..."
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 transition placeholder:opacity-30"
                  />
                </div>

                {/* Sync options / Alter catalog cost price standard */}
                <label className="flex items-start gap-2 bg-slate-900/40 p-2.5 rounded border border-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={restockForm.atualizarCadastro}
                    onChange={(e) => setRestockForm({ ...restockForm, atualizarCadastro: e.target.checked })}
                    className="mt-0.5 w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-500 rounded border-slate-700 bg-slate-850 cursor-pointer"
                  />
                  <div className="space-y-0.5 leading-none">
                    <span className="text-[10px] font-bold text-slate-200 block">Atualizar preço de compra padrão</span>
                    <span className="text-[9px] text-slate-400 block font-sans">Altera o valor de compra original do item no cadastro geral para R$ {restockForm.valorCompra.toFixed(2)}.</span>
                  </div>
                </label>
              </div>

              {/* Total Summary */}
              <div className="bg-slate-900/40 p-2.5 rounded border border-slate-800 text-right">
                <span className="text-[9px] font-mono text-slate-500 block uppercase">VALOR TOTAL DO LOTE</span>
                <span className="text-base font-extrabold font-mono text-emerald-400">
                  R$ {(restockForm.quantidade * restockForm.valorCompra).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setRestockItem(null)}
                className="px-3.5 py-1.5 text-[10px] font-bold text-slate-405 hover:text-white bg-[#1e293b] rounded transition cursor-pointer"
              >
                Cancelar
              </button>
              
              <button
                type="button"
                onClick={handleConfirmRestock}
                className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 rounded transition cursor-pointer font-mono tracking-wider uppercase"
              >
                <ShoppingCart className="h-3.5 w-3.5 text-white" />
                Confirmar Entrada
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Supabase Technical Integration Panel (Modal/Drawer) */}
      {isSupabasePanelOpen && (
        <div className="fixed inset-0 z-150 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in" id="supabase-config-modal">
          <div className="bg-[#0f172a] border border-slate-800 text-slate-100 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-5 py-4 bg-[#1e293b] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-emerald-450" />
                <h3 className="text-xs font-black uppercase tracking-widest font-mono text-emerald-500">
                  Integração Oficial Supabase
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSupabasePanelOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-5 text-slate-300">
              
              {/* Context Summary / Warning */}
              <div className="bg-slate-900/60 p-3.5 rounded border border-slate-800 text-[10.5px] leading-normal space-y-1">
                <p>
                  🚀 <strong className="text-white">Conecte o EletroEstoque à nuvem!</strong> Ao configurar suas credenciais do Supabase, o inventário passará a sincronizar e persistir todos os componentes eletrônicos e logs de movimentações em tempo real.
                </p>
                <p className="text-slate-400">
                  Caso o Supabase esteja temporariamente indisponível ou inacessível, o sistema fará um downgrade silencioso para o banco offline local em cache, prevenindo paradas.
                </p>
              </div>

              {/* Settings Form fields */}
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                    Supabase Project URL (VITE_SUPABASE_URL)
                  </label>
                  <input
                    type="text"
                    value={supabaseConfig.url}
                    onChange={(e) => setSupabaseConfig({ ...supabaseConfig, url: e.target.value })}
                    placeholder="https://your-project-id.supabase.co"
                    className="w-full bg-[#1e293b] border border-slate-700 rounded px-3 py-2 text-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-500/80 transition"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                    Supabase Anon Public API Key (VITE_SUPABASE_ANON_KEY)
                  </label>
                  <input
                    type="password"
                    value={supabaseConfig.anonKey}
                    onChange={(e) => setSupabaseConfig({ ...supabaseConfig, anonKey: e.target.value })}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-[#1e293b] border border-slate-700 rounded px-3 py-2 text-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-500/80 transition placeholder:opacity-40"
                  />
                </div>

                <div className="flex items-center justify-between bg-slate-900/40 p-3 rounded border border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-white uppercase block tracking-wide">Ativar Integração e Sync</span>
                    <span className="text-[9.5px] text-slate-400 block font-sans">Se desmarcado, as mudanças serão salvas apenas localmente.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={supabaseConfig.enabled}
                    onChange={(e) => setSupabaseConfig({ ...supabaseConfig, enabled: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded border-slate-705 bg-slate-800 cursor-pointer"
                  />
                </div>
              </div>

              {/* Status & Sync Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                
                {/* Integration Health */}
                <div className="p-3 bg-slate-900/50 rounded border border-slate-800 space-y-2">
                  <span className="text-[8.5px] font-mono uppercase tracking-wider text-slate-400 block">Status da Conexão</span>
                  
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${supabaseConfig.enabled ? 'bg-emerald-500 animate-pulse shadow-sm shadow-emerald-400/50' : 'bg-slate-500'}`} />
                    <span className="text-xs font-bold text-white font-mono">
                      {supabaseConfig.enabled ? 'Ativa (Sincronizando)' : 'Inativa (Banco Local)'}
                    </span>
                  </div>

                  {supabaseError && (
                    <p className="text-[9.5px] leading-snug text-rose-400 font-mono">
                      🔴 {supabaseError}
                    </p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        setIsSyncing(true);
                        setSupabaseError(null);
                        try {
                          saveSupabaseConfig(supabaseConfig.url, supabaseConfig.anonKey, supabaseConfig.enabled);
                          const client = getSupabaseClient();
                          if (!client) {
                            throw new Error('Preencha os campos URL e API Key primeiro.');
                          }
                          await dbFetchComponents();
                          triggerFeedback('Conexão estabelecida e tabelas validadas!', 'success');
                        } catch (err: any) {
                          console.error(err);
                          setSupabaseError(err.message || 'Erro ao realizar teste de conexão');
                          triggerFeedback('Falha no teste com Supabase.', 'error');
                        } finally {
                          setIsSyncing(false);
                        }
                      }}
                      disabled={isSyncing || !supabaseConfig.url || !supabaseConfig.anonKey}
                      className="flex-1 py-1 px-2 text-[9.5px] font-bold text-center border border-slate-700 text-slate-300 hover:text-white rounded bg-slate-800 hover:bg-slate-750 disabled:opacity-40 transition cursor-pointer"
                    >
                      {isSyncing ? 'Testando...' : 'Testar Banco'}
                    </button>

                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={() => {
                        saveSupabaseConfig(supabaseConfig.url, supabaseConfig.anonKey, supabaseConfig.enabled);
                        triggerFeedback('Configurações gravadas com sucesso!', 'success');
                        // Refresh to apply changes to app context
                        window.location.reload();
                      }}
                      className="flex-1 py-1 px-2 text-[9.5px] font-bold text-center text-white rounded bg-emerald-650 hover:bg-emerald-600 transition cursor-pointer"
                    >
                      Salvar & Aplicar
                    </button>
                  </div>
                </div>

                {/* Local Storage to Cloud Migrator/Seed */}
                <div className="p-3 bg-slate-900/50 rounded border border-slate-800 space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="text-[8.5px] font-mono uppercase tracking-wider text-slate-400 block mb-1">Carga & Sincronismo Inicial</span>
                    <p className="text-[9.5px] leading-relaxed text-slate-400">
                      Semeie sua planilha inicial ou histórico local para o Supabase! Essa operação subirá todos os componentes atuais ({totalItensUnicos} un.) e registros de logs para o banco em nuvem.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isSyncing || !supabaseConfig.url || !supabaseConfig.anonKey}
                    onClick={async () => {
                      if (window.confirm('Isso irá importar todos os registros de componentes e transações atuais para a nuvem. Dependendo de suas tabelas, isso fará upsert dos registros correspondentes de ID. Continuar?')) {
                        setIsSyncing(true);
                        try {
                          saveSupabaseConfig(supabaseConfig.url, supabaseConfig.anonKey, supabaseConfig.enabled);
                          const res = await syncLocalDataToSupabase(components, history);
                          triggerFeedback(`Sucesso! Sincronizados ${res.successComps} itens e ${res.successHist} registros!`, 'success');
                          setSupabaseError(null);
                        } catch (err: any) {
                          console.error(err);
                          setSupabaseError(`Erro no envio de dados: ${err.message}`);
                          triggerFeedback('Falha na importação inicial.', 'error');
                        } finally {
                          setIsSyncing(false);
                        }
                      }
                    }}
                    className="w-full mt-1.5 py-1.5 px-2 text-[9.5px] font-bold text-center text-emerald-999 bg-emerald-450 hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-450 rounded transition cursor-pointer font-mono tracking-wide uppercase"
                  >
                    {isSyncing ? 'Sincronizando...' : 'Enviar Local -> Supabase Cloud'}
                  </button>
                </div>
              </div>

              {/* SQL script area */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-405 uppercase tracking-wider font-mono">
                    Script SQL do Banco (Copie e Cole no Supabase)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
                      setIsCopied(true);
                      triggerFeedback('Código SQL copiado para o clipboard!', 'success');
                      setTimeout(() => setIsCopied(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[9.5px] font-bold bg-[#1e293b] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    {isCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {isCopied ? 'Copiado!' : 'Copiar SQL'}
                  </button>
                </div>

                <div className="relative">
                  <pre className="text-[9.5px] leading-relaxed font-mono bg-[#090d16] p-3 rounded-lg text-slate-300 border border-slate-800 overflow-x-auto max-h-36">
                    {SUPABASE_SQL_SETUP}
                  </pre>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>Status: {isSyncing ? 'Sincronizando dados...' : 'Pronto'}</span>
              <button
                type="button"
                onClick={() => setIsSupabasePanelOpen(false)}
                className="px-4 py-1 text-[10px] font-bold text-slate-450 hover:text-white bg-[#1e293b] rounded transition hover:bg-slate-800 cursor-pointer"
              >
                Voltar ao Estoque
              </button>
            </div>

          </div>
        </div>
      )}

      {/* High Density h-14 Header */}
      <header className="h-14 bg-[#1e293b] text-white flex items-center justify-between px-6 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded text-white flex items-center justify-center">
            <Boxes className="h-5 w-5" />
          </div>
          <h1 className="text-xs font-black tracking-widest uppercase flex items-center gap-1.5 font-mono">
            EletroEstoque <span className="text-blue-400 font-normal">S.A.</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {totalEstoqueBaixoAlerts > 0 && (
            <div className="flex items-center gap-1 bg-red-600/35 px-2 py-1 rounded border border-red-500/40 text-[9px] font-extrabold uppercase font-mono tracking-wider animate-pulse">
              <span>{totalEstoqueBaixoAlerts} EM BAIXA</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsSupabasePanelOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded transition cursor-pointer uppercase tracking-wider border ${
              supabaseConfig.enabled
                ? 'bg-[#064e3b]/35 text-[#10b981] border-[#10b981]/30 hover:bg-[#064e3b]/50'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
            }`}
            title="Configure as credenciais de conexão do Supabase"
          >
            <Database className={`h-3 w-3 ${supabaseConfig.enabled ? 'animate-pulse text-emerald-400' : ''}`} />
            <span>Supabase</span>
            {isSyncing ? (
              <RefreshCw className="h-2.5 w-2.5 animate-spin text-slate-400" />
            ) : (
              <span className={`w-1.5 h-1.5 rounded-full ${supabaseConfig.enabled ? 'bg-emerald-500 shadow-sm shadow-emerald-450' : 'bg-slate-500'}`} />
            )}
          </button>
          <button
            type="button"
            onClick={handleResetDatabase}
            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition cursor-pointer uppercase tracking-wider"
            title="Apaga as mudanças e recarrega os componentes eletrônicos padrão"
          >
            <RotateCcw className="h-3 w-3" />
            Resetar
          </button>
          <button
            type="button"
            onClick={() => {
              setComponentToEdit(null);
              setIsFormOpen(!isFormOpen);
            }}
            className="flex items-center gap-1 px-3 py-1 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm rounded transition cursor-pointer uppercase tracking-wider"
          >
            <Plus className="h-3.5 w-3.5" />
            {isFormOpen ? 'Fechar Form' : 'Adicionar'}
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 flex flex-col lg:flex-row gap-4 items-start animate-fade-in" id="app-main-layout">
        
        {/* Left Side: Dynamic Sticky Form Sidebar (When open) */}
        {isFormOpen && (
          <aside className="w-full lg:w-80 shrink-0 sticky top-4" id="form-sidebar-container">
            <ComponentForm
              componentToEdit={componentToEdit}
              existingComponents={components}
              categorias={CATEGORIAS_PADRAO}
              onSubmit={handleSaveComponent}
              onCancel={() => {
                setIsFormOpen(false);
                setComponentToEdit(null);
              }}
            />
          </aside>
        )}

        {/* Right Side: Dashboard Main Metrics, Low Stock Action banner & Full Inventories */}
        <section className="flex-1 w-full space-y-4 flex flex-col justify-stretch">
          
          {/* Flat statistics micro meters row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in" id="stats-dashboard-grid">
            <MetricCard
              title="Itens Únicos"
              value={totalItensUnicos}
              description="Cadastrados no mostruário"
              iconName="Boxes"
              colorScheme="slate"
            />
            <MetricCard
              title="Total Unidades"
              value={`${totalUnidadesInEstoque} un.`}
              description={`${totalEsgotadoAlerts} itens esgotados`}
              iconName="Package"
              colorScheme="indigo"
            />
            <MetricCard
              title="Custo Ativo"
              value={`R$ ${totalBuyingCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              description="Soma do valor de compra"
              iconName="ArrowDownRight"
              colorScheme="cyan"
            />
            {totalEstoqueBaixoAlerts > 0 ? (
              <MetricCard
                title="Aviso Reposição"
                value={`${totalEstoqueBaixoAlerts} Alertas`}
                description={`${totalEsgotadoAlerts} esgotado. Ver abaixo.`}
                iconName="TriangleAlert"
                colorScheme="rose"
              />
            ) : (
              <MetricCard
                title="Margem de Lucro"
                value={`R$ ${totalPotentialProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                description="Potencial margem de retorno"
                iconName="ArrowUpRight"
                colorScheme="emerald"
              />
            )}
          </div>

          {/* Quick Purchasing Order Alert list list */}
          {totalEstoqueBaixoAlerts > 0 && (
            <AlertBanner
              components={components}
              onRestockQuick={handleQuickRestock}
            />
          )}

          {/* Active Cart Banner teaser for quick cashier checkout redirection */}
          {cart.length > 0 && activeTab !== 'carrinho' && (
            <div className="bg-emerald-600 text-white p-3 rounded-lg shadow-xs flex items-center justify-between flex-wrap gap-2 border border-emerald-500/10" id="cart-active-teaser-row animate-fade-in">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 animate-bounce shrink-0" />
                <span className="text-xs font-bold font-mono uppercase tracking-wide">
                  Há {cart.reduce((sum, item) => sum + item.quantidade, 0)} item(ns) aguardando faturamento no carrinho de balcão!
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('carrinho')}
                className="px-3 py-1 bg-white text-emerald-800 font-black text-[9.5px] uppercase tracking-wider rounded font-mono hover:bg-emerald-50 transition cursor-pointer shadow-2xs"
              >
                Fechar Pedidos Diferentes (Ir para o PDV) →
              </button>
            </div>
          )}

          {/* Listing Inventory panel */}
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-4" id="main-inventory-table-container">
            <div className="flex border-b border-gray-200 pb-2 mb-3.5 items-center justify-between flex-wrap gap-2">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('estoque')}
                  className={`pb-2.5 text-xs font-bold uppercase tracking-wider relative transition cursor-pointer ${
                    activeTab === 'estoque' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Estoque Completo
                  {activeTab === 'estoque' && (
                    <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('carrinho')}
                  className={`pb-2.5 text-xs font-bold uppercase tracking-wider relative transition cursor-pointer flex items-center gap-1 ${
                    activeTab === 'carrinho' ? 'text-blue-600 animate-pulse' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Carrinho / PDV
                  {cart.length > 0 ? (
                    <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full font-mono shadow-xs">
                      {cart.reduce((sum, item) => sum + item.quantidade, 0)}
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-400 text-[9px] font-bold px-1 py-0.2 rounded font-mono border border-slate-200">
                      0
                    </span>
                  )}
                  {activeTab === 'carrinho' && (
                    <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('historico')}
                  className={`pb-2.5 text-xs font-bold uppercase tracking-wider relative transition cursor-pointer flex items-center gap-1 ${
                    activeTab === 'historico' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Histórico Geral
                  {history.length > 0 && (
                    <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-1 py-0.2 rounded font-mono border border-slate-250">
                      {history.length}
                    </span>
                  )}
                  {activeTab === 'historico' && (
                    <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                  )}
                </button>
              </div>

              <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                <HelpCircle className="h-3 w-3 text-gray-400" />
                Duplicidade de SKU e Nome é bloqueada
              </div>
            </div>

            {activeTab === 'estoque' ? (
              <>
                {/* Search Board */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
                  <div className="md:col-span-2 relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                      <Search className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type="text"
                      className="w-full pl-8 pr-8 py-1.5 rounded border border-gray-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      placeholder="Pesquisar por Nome ou SKU..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="absolute inset-y-0 right-0 px-2.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Categories */}
                  <div>
                    <select
                      className="w-full px-2 py-1.5 rounded border border-gray-350 bg-white text-xs outline-none focus:ring-1 focus:ring-blue-500"
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}
                    >
                      <option value="todas">Todas as Categorias</option>
                      {CATEGORIAS_PADRAO.map(cat => (
                        <option key={cat.id} value={cat.nome}>
                          {cat.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Warnings Select */}
                  <div>
                    <select
                      className="w-full px-2 py-1.5 rounded border border-gray-350 bg-white text-xs outline-none focus:ring-1 focus:ring-blue-500"
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value as any)}
                    >
                      <option value="todos">Todos os Status</option>
                      <option value="baixo">Em Reposição (Baixo)</option>
                      <option value="esgotado">Esgotados (Zerados)</option>
                      <option value="normal">Estoque Saudável</option>
                    </select>
                  </div>
                </div>

                {/* Data Table */}
                {processedComponents.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 border border-dashed border-gray-200 rounded bg-gray-50" id="empty-results-box">
                    <Package className="h-6 w-6 mx-auto mb-2 opacity-30 text-gray-400" />
                    <p className="text-xs font-bold uppercase text-slate-700">Nenhum componente encontrado</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 max-w-sm mx-auto leading-tight">
                      Tente alterar seus filtros. Se necessário, clique em "Resetar" para recarregar o inventário de teste.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded">
                    <table className="w-full text-left border-collapse min-w-[800px]" id="inventory-list-table">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase font-mono">
                          <th className="py-1.5 px-3 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap" onClick={() => handleHeaderSort('sku')}>
                            <div className="flex items-center gap-1">
                              SKU / Código
                              <ArrowUpDown className="h-3 w-3 inline text-slate-450" />
                            </div>
                          </th>
                          <th className="py-1.5 px-3 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleHeaderSort('nome')}>
                            <div className="flex items-center gap-1">
                              Descrição do Componente
                              <ArrowUpDown className="h-3 w-3 inline text-slate-455" />
                            </div>
                          </th>
                          <th className="py-1.5 px-3 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleHeaderSort('categoria')}>
                            <div className="flex items-center gap-1">
                              Categoria
                              <ArrowUpDown className="h-3 w-3 inline text-slate-455" />
                            </div>
                          </th>
                          <th className="py-1.5 px-3 text-right cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap" onClick={() => handleHeaderSort('quantidade')}>
                            <div className="flex items-center justify-end gap-1">
                              Estoque
                              <ArrowUpDown className="h-3 w-3 inline text-slate-455" />
                            </div>
                          </th>
                          <th className="py-1.5 px-3 text-right cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap" onClick={() => handleHeaderSort('valorCompra')}>
                            <div className="flex items-center justify-end gap-1">
                              Compra
                              <ArrowUpDown className="h-3 w-3 inline text-slate-455" />
                            </div>
                          </th>
                          <th className="py-1.5 px-3 text-right cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap" onClick={() => handleHeaderSort('valorVenda')}>
                            <div className="flex items-center justify-end gap-1">
                              Venda
                              <ArrowUpDown className="h-3 w-3 inline text-slate-455" />
                            </div>
                          </th>
                          <th className="py-1.5 px-3 text-right cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap" onClick={() => handleHeaderSort('lucro')}>
                            <div className="flex items-center justify-end gap-1">
                              Lucro/Un
                              <ArrowUpDown className="h-3 w-3 inline text-slate-455" />
                            </div>
                          </th>
                          <th className="py-1.5 px-3 text-center whitespace-nowrap">Controles / Balcão</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 text-[11px]">
                        {processedComponents.map(item => {
                          const isUnderThreshold = item.quantidade <= item.minimoEstoque;
                          const isZero = item.quantidade === 0;

                          const catConfig = CATEGORIAS_PADRAO.find(cat => cat.nome === item.categoria) || {
                            cor: 'bg-slate-105 text-slate-700 border-slate-200'
                          };

                          const profit = item.valorVenda - item.valorCompra;
                          const profitPercent = (profit / item.valorCompra) * 100;

                          return (
                            <tr key={item.id} className="hover:bg-gray-50/70 transition duration-150 group" id={`row-${item.id}`}>
                              
                              {/* SKU tag */}
                              <td className="py-1.5 px-3 whitespace-nowrap">
                                <span className="font-mono text-[9px] font-bold text-gray-550 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 select-all block w-fit">
                                  {item.sku}
                                </span>
                              </td>

                              {/* Descriptive Name & Comments */}
                              <td className="py-1.5 px-3 font-medium">
                                <div className="font-bold text-slate-805 leading-tight select-all truncate max-w-xs md:max-w-sm" title={item.nome}>
                                  {item.nome}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {item.localizacao && (
                                    <span className="text-[9px] text-[#1e293b]/85 bg-[#1e293b]/5 px-1 rounded truncate max-w-[150px]" title={`Posição: ${item.localizacao}`}>
                                      📦 {item.localizacao}
                                    </span>
                                  )}
                                  {item.descricao && (
                                    <span className="text-[9px] text-gray-450 italic truncate max-w-[200px]" title={item.descricao}>
                                      {item.descricao}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Category Colored Badges */}
                              <td className="py-1.5 px-3 whitespace-nowrap">
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${catConfig.cor}`}>
                                  {item.categoria}
                                </span>
                              </td>

                              {/* Quantity units and color thresholds indicators */}
                              <td className="py-1.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1 font-bold font-mono text-[11px]">
                                  <span className={`${
                                    isZero ? 'text-red-700 font-extrabold' : isUnderThreshold ? 'text-yellow-600' : 'text-slate-800'
                                  }`}>
                                    {item.quantidade} un.
                                  </span>
                                </div>
                                
                                <div className="text-[9px] text-gray-400 pr-0.5 mt-0.2">
                                  {isZero ? (
                                    <span className="text-red-650 font-black uppercase font-mono">[Zerado]</span>
                                  ) : isUnderThreshold ? (
                                    <span className="text-yellow-600 font-bold uppercase">Repor (&lt;={item.minimoEstoque})</span>
                                  ) : (
                                    <span>Mín. {item.minimoEstoque}</span>
                                  )}
                                </div>
                              </td>

                              {/* Purchase buying individual price */}
                              <td className="py-1.5 px-3 text-right font-mono text-gray-500 text-[11px] whitespace-nowrap">
                                R$ {item.valorCompra.toFixed(2)}
                              </td>

                              {/* Sale price */}
                              <td className="py-1.5 px-3 text-right font-mono text-slate-805 font-bold text-[11px] whitespace-nowrap">
                                R$ {item.valorVenda.toFixed(2)}
                              </td>

                              {/* Derived Profit Margin */}
                              <td className="py-1.5 px-3 text-right font-mono text-emerald-600 font-bold text-[10px] whitespace-nowrap leading-none">
                                <div>+R$ {profit.toFixed(2)}</div>
                                <div className="text-[8px] text-gray-400 font-normal">(+{profitPercent.toFixed(0)}%)</div>
                              </td>

                              {/* Functional management row tools */}
                              <td className="py-1 px-2">
                                <div className="flex gap-1 justify-center items-center font-mono">
                                  {/* Increment / Decrement quick counters */}
                                  <div className="border border-gray-200 rounded p-0.5 flex items-center bg-gray-50 hover:bg-gray-100 select-none mr-1.5 shadow-2xs" id={`inventory-row-fast-sell-${item.id}`}>
                                    <button
                                      onClick={() => handleQuickSale(item.id, 1)}
                                      className="p-0.5 text-gray-550 hover:text-red-650 rounded hover:bg-white transition disabled:opacity-20 cursor-pointer"
                                      title="Vender Rápida (1 un)"
                                      disabled={item.quantidade === 0}
                                    >
                                      <MinusCircle className="h-3 w-3" />
                                    </button>
                                    <span className="text-[8px] font-mono font-bold text-gray-400 px-1 uppercase">venda</span>
                                    <button
                                      onClick={() => handleQuickRestock(item.id, 1)}
                                      className="p-0.5 text-gray-550 hover:text-green-600 rounded hover:bg-white transition cursor-pointer"
                                      title="Comprar / Reabastecer 1 unidade"
                                    >
                                      <PlusCircle className="h-3 w-3" />
                                    </button>
                                  </div>

                                  {/* Add to Cart button for multi-item checkouts */}
                                  <button
                                    onClick={() => handleAddToCart(item.id)}
                                    className="flex items-center gap-1.5 px-2 py-1 text-[8.5px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 rounded transition cursor-pointer"
                                    title="Adicionar item ao carrinho para vendas combinadas"
                                    disabled={item.quantidade === 0}
                                  >
                                    <ShoppingCart className={`h-3 w-3 ${item.quantidade === 0 ? 'text-gray-300' : 'text-emerald-500 animate-pulse'}`} />
                                    <span className="uppercase tracking-wider font-mono text-[8.5px] font-black">+Carrinho</span>
                                  </button>

                                  {/* EDIT details */}
                                  <button
                                    onClick={() => {
                                      setComponentToEdit(item);
                                      setIsFormOpen(true);
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="p-1 rounded text-gray-450 hover:text-blue-600 hover:bg-blue-50 border border-transparent transition cursor-pointer font-sans"
                                    title="Editar"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>

                                  {/* DELETE permanent */}
                                  <button
                                    onClick={() => handleDeleteComponent(item.id, item.nome)}
                                    className="p-1 rounded text-gray-450 hover:text-red-600 hover:bg-red-50 border border-transparent transition cursor-pointer font-sans"
                                    title="Deletar permanentemente"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : activeTab === 'carrinho' ? (
              <div className="space-y-4 animate-fade-in" id="carrinho-pdv-workspace">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-100">
                      <ShoppingCart className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wider">Terminal de Vendas PDV (Carrinho)</h3>
                      <p className="text-[10px] text-gray-400">Monte pedidos com múltiplos componentes combinados para faturamento simultâneo.</p>
                    </div>
                  </div>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearCart}
                      className="text-[10px] uppercase font-bold tracking-wider text-rose-600 bg-rose-50 border border-rose-100 rounded px-2.5 py-1.5 hover:bg-rose-100 transition cursor-pointer"
                    >
                      Esvaziar Carrinho
                    </button>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div className="py-12 text-center rounded bg-slate-50 border border-dashed border-gray-200">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Carrinho Vacio</h4>
                    <p className="text-[10.5px] text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
                      Seu carrinho de balcão não contém produtos. Navegue na aba anterior <strong>"Estoque Completo"</strong> e clique no botão <strong>"+ Carrinho"</strong> nos componentes que o cliente deseja.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('estoque')}
                      className="mt-4 px-4 py-1.5 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition font-mono tracking-wider uppercase cursor-pointer"
                    >
                      Voltar ao Estoque
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Items List inside Cart */}
                    <div className="lg:col-span-2 space-y-2 max-h-[500px] overflow-y-auto pr-1">
                      {cart.map(cartItem => {
                        const item = components.find(c => c.id === cartItem.componentId);
                        if (!item) return null;

                        const subtotalUnit = item.valorVenda * cartItem.quantidade;
                        const hasExceededStock = cartItem.quantidade > item.quantidade;

                        return (
                          <div 
                            key={cartItem.componentId} 
                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-white transition duration-150 ${
                              hasExceededStock ? 'border-red-300 bg-red-50/20' : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="space-y-0.5 max-w-sm">
                              <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-205 px-1 py-0.2 rounded">
                                {item.sku}
                              </span>
                              <h4 className="text-xs font-semibold text-slate-800 leading-tight block mt-1">
                                {item.nome}
                              </h4>
                              <div className="flex gap-2 text-[9.5px] text-gray-500 font-sans">
                                <span>Estoque Disp: <strong className="text-slate-700 font-mono">{item.quantidade} un.</strong></span>
                                <span>•</span>
                                <span>Preço Unit: <strong className="text-slate-700 font-mono">R$ {item.valorVenda.toFixed(2)}</strong></span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4 mt-3.5 sm:mt-0">
                              {/* Quantity selection controller */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCartQty(cartItem.componentId, cartItem.quantidade - 1)}
                                  className="p-1 border border-gray-300 text-gray-650 rounded hover:bg-gray-50 transition cursor-pointer"
                                >
                                  <MinusCircle className="h-3.5 w-3.5" />
                                </button>
                                
                                <input
                                  type="number"
                                  min="1"
                                  max={item.quantidade}
                                  value={cartItem.quantidade}
                                  onChange={(e) => handleUpdateCartQty(cartItem.componentId, parseInt(e.target.value) || 0)}
                                  className="w-12 text-center bg-gray-50 border border-gray-300 rounded text-xs font-mono font-bold py-0.5 focus:outline-none"
                                />

                                <button
                                  type="button"
                                  onClick={() => handleUpdateCartQty(cartItem.componentId, cartItem.quantidade + 1)}
                                  className="p-1 border border-gray-300 text-gray-650 rounded hover:bg-gray-50 transition cursor-pointer"
                                >
                                  <PlusCircle className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              {/* Price Subtotal block */}
                              <div className="text-right min-w-[75px] font-mono">
                                <span className="block text-[8.5px] text-gray-400 leading-none">SUBTOTAL</span>
                                <span className="text-xs font-extrabold text-slate-800">
                                  R$ {subtotalUnit.toFixed(2)}
                                </span>
                              </div>

                              {/* Remove fully from cart */}
                              <button
                                type="button"
                                onClick={() => handleRemoveFromCart(cartItem.componentId)}
                                className="p-1 hover:text-red-650 hover:bg-red-50 rounded transition text-gray-400 cursor-pointer"
                                title="Remover item"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Checkout Panel & Calculations */}
                    <div className="bg-slate-50 border border-gray-200 rounded-lg p-3.5 space-y-3">
                      <h4 className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider">
                        Resumo & Confirmação
                      </h4>

                      {/* Payment fields */}
                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="block text-[9px] font-bold text-gray-550 uppercase tracking-widest mb-1">
                            Nome do Cliente (Opcional)
                          </label>
                          <input
                            type="text"
                            value={checkoutForm.clienteNome}
                            onChange={(e) => setCheckoutForm({ ...checkoutForm, clienteNome: e.target.value })}
                            placeholder="Ex: Igor Wanderlei"
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-gray-550 uppercase tracking-widest mb-1">
                            Meio de Pagamento *
                          </label>
                          <select
                            value={checkoutForm.metodoPagamento}
                            onChange={(e) => setCheckoutForm({ ...checkoutForm, metodoPagamento: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="PIX">PIX (Chave Instantânea)</option>
                            <option value="Dinheiro">Dinheiro físico</option>
                            <option value="Cartão de Crédito">Cartão de Crédito</option>
                            <option value="Cartão de Débito">Cartão de Débito</option>
                            <option value="Faturado">Faturado / Prazo / NF-e</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-gray-550 uppercase tracking-widest mb-1">
                            Observações Gerais do Pedido
                          </label>
                          <input
                            type="text"
                            value={checkoutForm.observacao}
                            onChange={(e) => setCheckoutForm({ ...checkoutForm, observacao: e.target.value })}
                            placeholder="Ex: Entrega direta para lab estudantil"
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:opacity-40"
                          />
                        </div>
                      </div>

                      {/* Financial Math block */}
                      <div className="border-t border-gray-200 pt-3 space-y-1.5 font-mono text-[10.5px]">
                        <div className="flex justify-between text-gray-500">
                          <span>Qtd de Itens Total:</span>
                          <span className="font-bold">
                            {cart.reduce((sum, item) => sum + item.quantidade, 0)} un.
                          </span>
                        </div>

                        {/* Real-time estimate of cost vs revenue */}
                        {(() => {
                          let totalVenda = 0;
                          let totalCusto = 0;

                          cart.forEach(cartItem => {
                            const comp = components.find(c => c.id === cartItem.componentId);
                            if (comp) {
                              totalVenda += comp.valorVenda * cartItem.quantidade;
                              totalCusto += comp.valorCompra * cartItem.quantidade;
                            }
                          });

                          const totalMargem = totalVenda - totalCusto;
                          const profitPct = totalCusto > 0 ? (totalMargem / totalCusto) * 100 : 0;

                          return (
                            <>
                              <div className="flex justify-between text-gray-500 border-b border-gray-150 pb-1">
                                <span>Custo de Aquisição:</span>
                                <span>R$ {totalCusto.toFixed(2)}</span>
                              </div>
                              
                              <div className="flex justify-between text-slate-800 pt-0.5">
                                <span className="font-sans font-bold">TOTAL DA VENDA:</span>
                                <span className="text-sm font-extrabold text-blue-600">
                                  R$ {totalVenda.toFixed(2)}
                                </span>
                              </div>

                              <div className="flex justify-between text-emerald-600 font-sans p-1.5 rounded bg-emerald-500/10 border border-emerald-500/10">
                                <span>Lucro Estimado (+{profitPct.toFixed(0)}%):</span>
                                <span className="font-mono font-bold">+R$ {totalMargem.toFixed(2)}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Check-out Action command CTA */}
                      <button
                        type="button"
                        onClick={handleCheckoutCart}
                        disabled={isSyncing}
                        className="w-full mt-2 py-2 px-3 text-white rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition cursor-pointer text-center text-[10.5px] font-black uppercase tracking-wider font-mono flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        {isSyncing ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            Sincronizando...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Finalizar & Baixar Estoque
                          </>
                        )}
                      </button>

                      {supabaseConfig.enabled && (
                        <div className="text-[8px] text-center text-slate-400 font-mono flex items-center justify-center gap-1">
                          <Cloud className="h-2.5 w-2.5 text-emerald-500" />
                          CONEXÃO SUPABASE NUVEM ATIVA PARA SYNC
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <TransactionHistory
                movimentacoes={history}
                onClearHistory={handleClearHistory}
              />
            )}
          </section>

          {/* Guide of Operations */}
          <section className="bg-white border border-gray-200 p-3.5 rounded-lg text-xs space-y-1.5" id="help-panel">
            <h4 className="font-bold text-slate-800 flex items-center gap-1 font-mono tracking-wider uppercase text-[9px]">
              <BookOpen className="h-3.5 w-3.5 text-blue-600" />
              Guia Técnico de Diretrizes
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[10.5px] text-gray-600 leading-normal">
              <div className="p-2 border border-gray-100 rounded bg-gray-50/50">
                <strong className="text-[#1e293b] font-mono text-[9px] uppercase tracking-wide block mb-0.5">1. Bloqueio de SKU/Nome Duplicados:</strong>
                O inventário impede de forma absoluta o registro de peças com ID de catálogo ou nomes idênticos, mitigando erros no faturamento operacional.
              </div>
              <div className="p-2 border border-gray-105 rounded bg-gray-50/50">
                <strong className="text-[#1e293b] font-mono text-[9px] uppercase tracking-wide block mb-0.5">2. Parâmetros Obrigatórios:</strong>
                Todo cadastro de Arduino ou sensor exige quantidades físicas em lote, custos de compra declarados e valores de balcão regulados.
              </div>
              <div className="p-2 border border-gray-105 rounded bg-gray-50/50">
                <strong className="text-[#1e293b] font-mono text-[9px] uppercase tracking-wide block mb-0.5">3. Alertas de Segurança:</strong>
                Gatilhos automatizados disparam a lista de compras para itens em margens críticas de segurança fiduciária ou estoque zerado.
              </div>
            </div>
          </section>

        </section>
      </main>

      {/* Slick Minimalist Footer */}
      <footer className="bg-[#1e293b] border-t border-slate-700 py-3.5 text-center text-[10px] text-slate-400 mt-6 shrink-0 font-mono">
        <div>© 2026 EletroEstoque | Lojas de Automação, Componentes Maker e Arduino</div>
        <div className="mt-0.5 opacity-75 text-[9px]">
          Status do Sistema: {supabaseConfig.enabled ? 'Sincronizado na Nuvem (Supabase)' : 'Banco Local Sincronizado'} | Versão 2.1.2
        </div>
      </footer>
    </div>
  );
}
