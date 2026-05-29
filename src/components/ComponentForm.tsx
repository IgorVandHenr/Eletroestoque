/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ComponenteEletronico, CategoriaConfig } from '../types';
import { MODELOS_DE_PREENCHIMENTO } from '../data/defaultComponents';
import { Box, Sparkles, AlertCircle, RefreshCw, Layers } from 'lucide-react';

interface ComponentFormProps {
  componentToEdit: ComponenteEletronico | null;
  existingComponents: ComponenteEletronico[];
  categorias: CategoriaConfig[];
  onSubmit: (component: Omit<ComponenteEletronico, 'id' | 'criadoEm' | 'atualizadoEm'> & { id?: string }) => void;
  onCancel: () => void;
}

export default function ComponentForm({
  componentToEdit,
  existingComponents,
  categorias,
  onSubmit,
  onCancel,
}: ComponentFormProps) {
  // Form fields
  const [nome, setNome] = useState('');
  const [sku, setSku] = useState('');
  const [categoria, setCategoria] = useState('');
  const [quantidade, setQuantidade] = useState<number | ''>('');
  const [valorCompra, setValorCompra] = useState<number | ''>('');
  const [valorVenda, setValorVenda] = useState<number | ''>('');
  const [minimoEstoque, setMinimoEstoque] = useState<number>(5);
  const [localizacao, setLocalizacao] = useState('');
  const [descricao, setDescricao] = useState('');

  // Local validation alerts
  const [errors, setErrors] = useState<{
    nome?: string;
    sku?: string;
    quantidade?: string;
    valorCompra?: string;
    valorVenda?: string;
    categoria?: string;
    submit?: string;
  }>({});

  // Populate fields if editing
  useEffect(() => {
    if (componentToEdit) {
      setNome(componentToEdit.nome);
      setSku(componentToEdit.sku);
      setCategoria(componentToEdit.categoria);
      setQuantidade(componentToEdit.quantidade);
      setValorCompra(componentToEdit.valorCompra);
      setValorVenda(componentToEdit.valorVenda);
      setMinimoEstoque(componentToEdit.minimoEstoque);
      setLocalizacao(componentToEdit.localizacao || '');
      setDescricao(componentToEdit.descricao || '');
      setErrors({});
    } else {
      // Clear form
      setNome('');
      setSku('');
      setCategoria(categorias[0]?.nome || '');
      setQuantidade('');
      setValorCompra('');
      setValorVenda('');
      setMinimoEstoque(5);
      setLocalizacao('');
      setDescricao('');
      setErrors({});
    }
  }, [componentToEdit, categorias]);

  // Real-time duplicate & range checks
  useEffect(() => {
    const newErrors: typeof errors = {};

    const cleanNome = nome.trim().toLowerCase();
    const cleanSku = sku.trim().toUpperCase();

    if (cleanNome) {
      const isNomeDup = existingComponents.some(
        c => (!componentToEdit || c.id !== componentToEdit.id) && c.nome.toLowerCase().trim() === cleanNome
      );
      if (isNomeDup) {
        newErrors.nome = 'Já existe um componente cadastrado com este Nome.';
      }
    }

    if (cleanSku) {
      const isSkuDup = existingComponents.some(
        c => (!componentToEdit || c.id !== componentToEdit.id) && c.sku.toUpperCase().trim() === cleanSku
      );
      if (isSkuDup) {
        newErrors.sku = 'Este SKU já está em uso por outro componente.';
      }
    }

    // Number range checks
    if (quantidade !== '' && quantidade < 0) {
      newErrors.quantidade = 'A quantidade não pode ser negativa.';
    }
    if (valorCompra !== '' && valorCompra < 0) {
      newErrors.valorCompra = 'O valor de compra não pode ser negativo.';
    }
    if (valorVenda !== '' && valorVenda < 0) {
      newErrors.valorVenda = 'O valor de venda não pode ser negativo.';
    }

    setErrors(prev => ({
      ...prev,
      nome: newErrors.nome,
      sku: newErrors.sku,
      quantidade: newErrors.quantidade,
      valorCompra: newErrors.valorCompra,
      valorVenda: newErrors.valorVenda,
    }));
  }, [nome, sku, quantidade, valorCompra, valorVenda, existingComponents, componentToEdit]);

  // Quick fill with templates
  const handleQuickFill = (model: typeof MODELOS_DE_PREENCHIMENTO[0]) => {
    setNome(model.nome);
    setSku(model.sku);
    setCategoria(model.categoria);
    setValorCompra(model.valorCompra);
    setValorVenda(model.valorVenda);
    setMinimoEstoque(model.minimoEstoque);
    setDescricao(model.descricao);
    setLocalizacao(model.localizacao);
    setQuantidade(10); // Default test quantity
    setErrors({});
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanNome = nome.trim();
    const cleanSku = sku.trim().toUpperCase();
    const cleanCategoria = categoria || (categorias[0]?.nome || '');

    // Form validation
    const submissionErrors: typeof errors = {};

    if (!cleanNome) {
      submissionErrors.nome = 'O nome do componente é obrigatório.';
    }
    if (!cleanSku) {
      submissionErrors.sku = 'O código SKU é obrigatório.';
    }
    if (quantidade === '') {
      submissionErrors.quantidade = 'A quantidade em estoque é obrigatória.';
    }
    if (valorCompra === '') {
      submissionErrors.valorCompra = 'O valor de compra é obrigatório.';
    }
    if (valorVenda === '') {
      submissionErrors.valorVenda = 'O valor de venda do componente é obrigatório.';
    }

    // Check duplicates again on submit
    const isNomeDup = existingComponents.some(
      c => (!componentToEdit || c.id !== componentToEdit.id) && c.nome.toLowerCase().trim() === cleanNome.toLowerCase()
    );
    if (isNomeDup) {
      submissionErrors.nome = 'Erro: Componente duplicado. Este Nome de componente já existe.';
    }

    const isSkuDup = existingComponents.some(
      c => (!componentToEdit || c.id !== componentToEdit.id) && c.sku.toUpperCase().trim() === cleanSku
    );
    if (isSkuDup) {
      submissionErrors.sku = 'Erro: SKU duplicado. Este código SKU já está em uso.';
    }

    // If any errors, reject submission
    if (Object.keys(submissionErrors).length > 0 || errors.nome || errors.sku || errors.quantidade || errors.valorCompra || errors.valorVenda) {
      setErrors(prev => ({ ...prev, ...submissionErrors, submit: 'Por favor, corrija os erros no formulário antes de salvar.' }));
      return;
    }

    // Submit valid component
    onSubmit({
      nome: cleanNome,
      sku: cleanSku,
      categoria: cleanCategoria,
      quantidade: Number(quantidade),
      valorCompra: Number(valorCompra),
      valorVenda: Number(valorVenda),
      minimoEstoque: Number(minimoEstoque),
      localizacao: localizacao.trim() || undefined,
      descricao: descricao.trim() || undefined,
      ...(componentToEdit ? { id: componentToEdit.id } : {}),
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 w-full id-component-form" id="main-component-form">
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-[#1e293b]/10 text-[#1e293b]">
            <Box className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              {componentToEdit ? 'Editar Componente' : 'Cadastrar Componente'}
            </h3>
          </div>
        </div>

        {/* Templates Helper (Only on create mode) */}
        {!componentToEdit && (
          <div className="relative group/fill">
            <button
              type="button"
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition cursor-pointer"
            >
              <Sparkles className="h-2.5 w-2.5 animate-pulse" />
              Preencher
            </button>
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded shadow-lg border border-gray-200 p-2 hidden group-hover/fill:block group-focus-within/fill:block z-50 transition-all duration-200">
              <span className="block text-[9px] font-bold text-gray-500 mb-1 uppercase font-mono tracking-wider">Modelos de Arduino e Sensores:</span>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {MODELOS_DE_PREENCHIMENTO.map(m => (
                  <button
                    key={m.sku}
                    type="button"
                    onClick={() => handleQuickFill(m)}
                    className="w-full text-left text-[10px] p-1 rounded hover:bg-gray-50 border border-transparent hover:border-gray-100 transition flex items-center justify-between"
                  >
                    <span className="font-semibold text-slate-700 truncate max-w-[130px]">{m.nome}</span>
                    <span className="font-mono text-[8px] bg-slate-100 text-slate-600 px-1 rounded">{m.sku}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-3">
        {/* Row 1: Name */}
        <div>
          <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1" htmlFor="field-nome">
            Nome do Componente <span className="text-red-500">*</span>
          </label>
          <input
            id="field-nome"
            type="text"
            className={`w-full px-2.5 py-1.5 border rounded text-xs outline-none transition focus:ring-1 focus:ring-blue-500 ${
              errors.nome
                ? 'border-red-400 bg-red-50/10 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500'
            }`}
            placeholder="Ex: Arduino Uno R3"
            value={nome}
            onChange={e => setNome(e.target.value)}
          />
          {errors.nome && (
            <div className="mt-1 flex items-center gap-1 text-[10px] text-red-500">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span>{errors.nome}</span>
            </div>
          )}
        </div>

        {/* Row 2: SKU & Category */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1" htmlFor="field-sku">
              SKU <span className="text-red-500">*</span>
            </label>
            <input
              id="field-sku"
              type="text"
              className={`w-full px-2.5 py-1.5 border rounded text-xs font-mono outline-none transition focus:ring-1 focus:ring-blue-500 ${
                errors.sku
                  ? 'border-red-400 bg-red-50/10 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="Ex: ARD-UNO-R3"
              value={sku}
              onChange={e => setSku(e.target.value)}
            />
            {errors.sku && (
              <div className="mt-1 flex items-center gap-1 text-[10px] text-red-500">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{errors.sku}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1" htmlFor="field-categoria">
              Categoria <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="field-categoria"
                className="w-full appearance-none px-2.5 py-1.5 border border-gray-300 rounded bg-white text-xs outline-none transition focus:ring-1 focus:ring-blue-500 pr-7"
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
              >
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.nome}>
                    {cat.nome}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-400">
                <Layers className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Quantidade, Compra & Venda */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1" htmlFor="field-quantidade">
              Estoque <span className="text-red-500">*</span>
            </label>
            <input
              id="field-quantidade"
              type="number"
              step="1"
              min="0"
              className={`w-full px-2 py-1.5 border rounded text-xs outline-none transition focus:ring-1 focus:ring-blue-500 ${
                errors.quantidade ? 'border-red-400 bg-red-50/10' : 'border-gray-300'
              }`}
              placeholder="0"
              value={quantidade}
              onChange={e => {
                const val = e.target.value;
                setQuantidade(val === '' ? '' : Math.max(0, parseInt(val) || 0));
              }}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1" htmlFor="field-valor-compra">
              Compra (R$) <span className="text-red-500">*</span>
            </label>
            <input
              id="field-valor-compra"
              type="number"
              step="0.01"
              min="0"
              className={`w-full px-2 py-1.5 border rounded text-xs outline-none transition focus:ring-1 focus:ring-blue-500 ${
                errors.valorCompra ? 'border-red-400 bg-red-50/10' : 'border-gray-300'
              }`}
              placeholder="0.00"
              value={valorCompra}
              onChange={e => {
                const val = e.target.value;
                setValorCompra(val === '' ? '' : Math.max(0, parseFloat(val) || 0));
              }}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1" htmlFor="field-valor-venda">
              Venda (R$) <span className="text-red-500">*</span>
            </label>
            <input
              id="field-valor-venda"
              type="number"
              step="0.01"
              min="0"
              className={`w-full px-2 py-1.5 border rounded text-xs outline-none transition focus:ring-1 focus:ring-blue-500 ${
                errors.valorVenda ? 'border-red-400 bg-red-50/10' : 'border-gray-300'
              }`}
              placeholder="0.00"
              value={valorVenda}
              onChange={e => {
                const val = e.target.value;
                setValorVenda(val === '' ? '' : Math.max(0, parseFloat(val) || 0));
              }}
            />
          </div>
        </div>

        {/* Row 4: Estoque Mínimo & Localização */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1" htmlFor="field-minimo-estoque">
              Estoque Mínimo
            </label>
            <input
              id="field-minimo-estoque"
              type="number"
              step="1"
              min="0"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs outline-none transition focus:ring-1 focus:ring-blue-500"
              placeholder="5"
              value={minimoEstoque}
              onChange={e => setMinimoEstoque(Math.max(0, parseInt(e.target.value) || 0))}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1" htmlFor="field-localizacao">
              Gaveta / Posição
            </label>
            <input
              id="field-localizacao"
              type="text"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs outline-none transition focus:ring-1 focus:ring-blue-500"
              placeholder="Ex: Gaveta B3"
              value={localizacao}
              onChange={e => setLocalizacao(e.target.value)}
            />
          </div>
        </div>

        {/* Row 5: Descrição */}
        <div>
          <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1" htmlFor="field-descricao">
            Informações / Detalhes
          </label>
          <textarea
            id="field-descricao"
            rows={1.5}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs outline-none transition focus:ring-1 focus:ring-blue-500 resize-none animate-none"
            placeholder="Links para datasheet, pinout..."
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
          />
        </div>

        {/* Form Global Submit Error Warning */}
        {errors.submit && (
          <div className="p-2 bg-red-50 border border-red-100 rounded text-[10px] text-red-650 leading-tight flex items-start gap-1">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
            <span>{errors.submit}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1.5">
          <button
            type="button"
            onClick={onCancel}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded transition-colors text-[10px] uppercase tracking-wider text-center"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded shadow-sm transition-colors text-[10px] uppercase tracking-wider text-center cursor-pointer"
          >
            {componentToEdit ? 'Salvar' : 'Cadastrar'}
          </button>
        </div>
      </form>

      <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-100 text-center">
        <p className="text-[10px] text-blue-700 leading-tight italic font-medium">
          Sistema impede duplicidade de SKU e Nome automaticamente.
        </p>
      </div>
    </div>
  );
}
