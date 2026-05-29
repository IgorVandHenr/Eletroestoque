/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ComponenteEletronico, CategoriaConfig } from '../types';

export const CATEGORIAS_PADRAO: CategoriaConfig[] = [
  { id: '1', nome: 'Microcontroladores & Placas', cor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icone: 'Cpu' },
  { id: '2', nome: 'Sensores', cor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', icone: 'Eye' },
  { id: '3', nome: 'Atuadores & Motores', cor: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icone: 'Activity' },
  { id: '4', nome: 'Módulos', cor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', icone: 'Layers' },
  { id: '5', nome: 'Componentes Básicos', cor: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icone: 'Radio' },
  { id: '6', nome: 'Conectividade & Cabos', cor: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icone: 'Cable' },
  { id: '7', nome: 'Shields & Expansão', cor: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icone: 'Grid2X2' },
  { id: '8', nome: 'Fontes & Baterias', cor: 'bg-orange-500/10 text-orange-400 border-orange-500/20', icone: 'Zap' },
];

export const COMPONENTES_INICIAIS: ComponenteEletronico[] = [
  {
    id: 'comp_1',
    sku: 'ARD-UNO-R3',
    nome: 'Placa Uno R3 Integrada Atmega328P',
    categoria: 'Microcontroladores & Placas',
    quantidade: 4,
    valorCompra: 38.00,
    valorVenda: 69.90,
    minimoEstoque: 8,
    localizacao: 'Caixa Organizadora A - Divisória 1',
    descricao: 'Placa microcontroladora ideal para prototipagem rápida. Acompanha cabo USB azul de 30cm.',
    criadoEm: '2026-05-20T10:00:00Z',
    atualizadoEm: '2026-05-28T14:30:00Z'
  },
  {
    id: 'comp_2',
    sku: 'SEN-HCSR04',
    nome: 'Módulo Sensor de Distância Ultrassônico HC-SR04',
    categoria: 'Sensores',
    quantidade: 15,
    valorCompra: 5.50,
    valorVenda: 14.50,
    minimoEstoque: 10,
    localizacao: 'Gaveteiro B - Gaveta 3',
    descricao: 'Design clássico de 4 pinos (VCC, Trig, Echo, GND). Range de detecção de 2cm a 400cm.',
    criadoEm: '2026-05-20T10:15:00Z',
    atualizadoEm: '2026-05-25T09:00:00Z'
  },
  {
    id: 'comp_3',
    sku: 'ESP-WROOM-32',
    nome: 'Placa de Desenvolvimento ESP32 NodeMCU WiFi+BLE',
    categoria: 'Microcontroladores & Placas',
    quantidade: 12,
    valorCompra: 24.50,
    valorVenda: 49.90,
    minimoEstoque: 6,
    localizacao: 'Caixa Organizadora A - Divisória 5',
    descricao: 'Soc de baixo custo com Wi-Fi dual-mode integrado e antena interna na placa.',
    criadoEm: '2026-05-21T11:00:00Z',
    atualizadoEm: '2026-05-27T16:45:00Z'
  },
  {
    id: 'comp_4',
    sku: 'MOT-SER-SG90',
    nome: 'Micro Servo Motor 9g TowerPro SG90 180°',
    categoria: 'Atuadores & Motores',
    quantidade: 2,
    valorCompra: 7.90,
    valorVenda: 19.90,
    minimoEstoque: 12,
    localizacao: 'Gaveteiro B - Gaveta 1',
    descricao: 'Acompanha 3 tipos de braço plásticos helicoidais e parafusos de fixação.',
    criadoEm: '2026-05-21T11:20:00Z',
    atualizadoEm: '2026-05-29T11:10:00Z'
  },
  {
    id: 'comp_5',
    sku: 'MOD-RELE-5V-1C',
    nome: 'Módulo Relé 5V 1 Canal com Optoacoplador',
    categoria: 'Módulos',
    quantidade: 0,
    valorCompra: 4.80,
    valorVenda: 11.90,
    minimoEstoque: 8,
    localizacao: 'Gaveteiro C - Gaveta 2',
    descricao: 'Controle cargas de AC 110V/220V até 10A com sinal digital de 5V.',
    criadoEm: '2026-05-22T08:30:00Z',
    atualizadoEm: '2026-05-28T18:22:00Z'
  },
  {
    id: 'comp_6',
    sku: 'RES-220R-P20',
    nome: 'Kit de Resistor de Carbono 220 Ohms 1/4W (20 un.)',
    categoria: 'Componentes Básicos',
    quantidade: 45,
    valorCompra: 1.20,
    valorVenda: 4.00,
    minimoEstoque: 15,
    localizacao: 'Organizador Transparente D1',
    descricao: 'Resistores de alta precisão 5% de tolerância. Perfeitos para LEDs e botões básicos.',
    criadoEm: '2026-05-22T09:00:00Z',
    atualizadoEm: '2026-05-22T09:00:00Z'
  },
  {
    id: 'comp_7',
    sku: 'PRO-830-PTS',
    nome: 'Protoboard MB-102 830 Pontos com Adesivo',
    categoria: 'Shields & Expansão',
    quantidade: 3,
    valorCompra: 11.50,
    valorVenda: 23.90,
    minimoEstoque: 5,
    localizacao: 'Prateleira Superior Direita',
    descricao: 'Placa de ensaios com fita autoadesiva na parte de trás, facilitando montagens fixas.',
    criadoEm: '2026-05-23T14:20:00Z',
    atualizadoEm: '2026-05-29T10:00:00Z'
  },
  {
    id: 'comp_8',
    sku: 'CAB-JUMP-MF40',
    nome: 'Cabo Jumper Macho-Fêmea 20cm (Pack com 40 cores)',
    categoria: 'Conectividade & Cabos',
    quantidade: 22,
    valorCompra: 5.20,
    valorVenda: 12.00,
    minimoEstoque: 10,
    localizacao: 'Ganchos da Parede E1',
    descricao: 'Cabos coloridos destacáveis em fita ribbon, pinos com terminal metálico crimpado.',
    criadoEm: '2026-05-23T14:30:00Z',
    atualizadoEm: '2026-05-24T17:30:00Z'
  }
];

export const MODELOS_DE_PREENCHIMENTO = [
  {
    nome: 'Placa Compatível Nano V3.0 Atmega328P CH340',
    sku: 'ARD-NANO-V3',
    categoria: 'Microcontroladores & Placas',
    valorCompra: 18.00,
    valorVenda: 39.90,
    minimoEstoque: 6,
    descricao: 'Microcontrolador compacto com porta Mini-USB e chip controlador serial CH340.',
    localizacao: 'Caixa Organizadora A - Divisória 2'
  },
  {
    nome: 'Sensor de Presença Infravermelho PIR HC-SR501',
    sku: 'SEN-PIR-HCSR501',
    categoria: 'Sensores',
    valorCompra: 6.80,
    valorVenda: 16.50,
    minimoEstoque: 8,
    descricao: 'Ajuste de delay e sensibilidade integrados. Lente Fresnel blindada 120°.',
    localizacao: 'Gaveteiro B - Gaveta 4'
  },
  {
    nome: 'Display LCD 16x2 Keypad Shield HD44780',
    sku: 'SHI-LCD-16X2',
    categoria: 'Shields & Expansão',
    valorCompra: 16.90,
    valorVenda: 35.00,
    minimoEstoque: 4,
    descricao: 'Possui 5 botões de navegação analógicos e backlight azul ajustável por trimpot.',
    localizacao: 'Caixa Organizadora C - Divisória 1'
  },
  {
    nome: 'Módulo Display OLED 0.96 Polegadas I2C Azul/Amarelo',
    sku: 'DIS-OLED-0.96-I2C',
    categoria: 'Módulos',
    valorCompra: 12.50,
    valorVenda: 29.90,
    minimoEstoque: 10,
    descricao: 'Display de alta definição SSD1306 com apenas 4 pinos de ligação I2C.',
    localizacao: 'Gaveteiro C - Gaveta 4'
  }
];
