import { useEffect, useMemo, useState } from 'react';
import { DollarSign, PlusCircle, MinusCircle, Calendar, Save, Edit3, Trash2, X, TrendingUp, Package, Wallet, Target, Clock } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import type { Movimento } from '../types/cashflow';
import ViewerAlert from './ViewerAlert';

interface Venda {
  id: string;
  items: Array<{
    id: string;
    clothingItemId: string;
    clothingItemCode: string;
    clothingItemName: string;
    variationId: string;
    size: string;
    color: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    discount?: number;
  }>;
  subtotal: number;
  discount: number;
  discountType: 'percentual' | 'valor_fixo';
  total: number;
  paymentMethod: 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'transferencia' | 'cheque';
  status: 'pendente' | 'pago' | 'cancelado';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  sellerId?: string;
  sellerName?: string;
}

type DivisaoCaixa = {
  reinvestimento: number;
  caixaLoja: number;
  salario: number;
};
import { formatarMoeda, toTitleCase } from '../utils/calculations';

export default function CashFlow() {
  const { data: vendas, loading: vendasLoading, initialized: vendasInitialized } = useFirestore<Venda>('sales');
  const { data: movimentosReg, add: addMov, update: updateMov, remove: removeMov, loading: movimentosLoading, initialized: movimentosInitialized } = useFirestore<any>('fluxo');
  const { data: clothingItems } = useFirestore<any>('clothing');
  
  // Estado da divisão do caixa (persistente)
  const [divisaoCaixa, setDivisaoCaixa] = useState<DivisaoCaixa>({
    reinvestimento: 50,
    caixaLoja: 30,
    salario: 20,
  });

  // Formulário principal
  const [form, setForm] = useState<{
    data: string;
    descricao: string;
    origem: Movimento['origem'];
    valor: number;
    suborigem?: Movimento['suborigem'];
  }>({
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    origem: 'caixa',
    valor: 0,
    suborigem: 'reinvestimento'
  });

  // Estados de controle
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Movimento | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [movimentoToDelete, setMovimentoToDelete] = useState<Movimento | null>(null);
  
  // Estados para alerta do visualizador
  const [showViewerAlert, setShowViewerAlert] = useState(false);
  const [viewerAlertAction, setViewerAlertAction] = useState('');

  // Função para detectar se é visualizador
  const isViewer = () => {
    try {
      const user = localStorage.getItem('usekaylla_user');
      if (user) {
        const parsed = JSON.parse(user);
        return parsed.role === 'viewer';
      }
      return false;
    } catch {
      return false;
    }
  };

  // Função para mostrar alerta do visualizador
  const showViewerAlertForAction = (action: string) => {
    setViewerAlertAction(action);
    setShowViewerAlert(true);
  };

  // Formulário de edição
  const [editForm, setEditForm] = useState<{
    data: string;
    descricao: string;
    origem: Movimento['origem'];
    valor: number;
    suborigem?: Movimento['suborigem'];
  }>({
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    origem: 'caixa',
    valor: 0,
    suborigem: 'reinvestimento'
  });

  // Carregar configuração do localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('fluxo_divisao_caixa');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          typeof parsed?.reinvestimento === 'number' &&
          typeof parsed?.caixaLoja === 'number' &&
          typeof parsed?.salario === 'number'
        ) {
          setDivisaoCaixa(parsed);
        }
      }
    } catch {}
  }, []);

  // Cálculo do caixa principal
  const caixa = useMemo(() => {
    let totalVendas = 0;
    let valorEmbalagem = 0;
    let valoresPendentes = 0;
    
    // Filtrar apenas vendas pagas
    const vendasPagas = vendas.filter(v => v.status === 'pago');
    
    vendasPagas.forEach(v => {
      totalVendas += v.total;
      // CORREÇÃO: Calcular embalagem baseada no valor real de cada peça vendida
      // Cada variação vendida = 1 embalagem (usar packagingCost da peça)
      valorEmbalagem += v.items.reduce((t, item) => {
        // Buscar a peça para obter o packagingCost real
        const peca = clothingItems.find(p => p.id === item.clothingItemId);
        const custoEmbalagem = peca?.packagingCost || 0;
        return t + (item.quantity * custoEmbalagem);
      }, 0);
    });
    
    // Calcular valores pendentes
    const vendasPendentes = vendas.filter(v => v.status === 'pendente');
    vendasPendentes.forEach(v => {
      valoresPendentes += v.total;
    });
    
    // Removido: Lucro total não faz sentido no fluxo de caixa

    const saidasCaixa = movimentosReg
      .filter(m => m.origem === 'caixa' && m.tipo === 'saida')
      .reduce((t, m) => t + m.valor, 0);
      
    const saidasEmbalagem = movimentosReg
      .filter(m => m.origem === 'embalagem' && m.tipo === 'saida')
      .reduce((t, m) => t + m.valor, 0);

    // Saldo de caixa = vendas - saídas de caixa (sem subtrair embalagem)
    const saldoCaixa = Math.max(0, totalVendas - saidasCaixa);
    
    // Saldo de embalagem = valor de embalagem vendido - saídas de embalagem
    const saldoEmbalagem = Math.max(0, valorEmbalagem - saidasEmbalagem);

    return {
      totalVendas,
      valorEmbalagem,
      valoresPendentes,
      saldoCaixa,
      saldoEmbalagem,
      saidasCaixa,
      saidasEmbalagem,
    };
  }, [vendas, movimentosReg, clothingItems]);

  // Cálculo das saídas por subcategoria
  const saidasSub = useMemo(() => {
    console.log('🔍 saidasSub: ===== INICIANDO CÁLCULO DAS SAÍDAS =====');
    console.log('🔍 saidasSub: Movimentos disponíveis:', movimentosReg.length);
    console.log('🔍 saidasSub: Movimentos de caixa:', movimentosReg.filter(m => m.origem === 'caixa').length);
    
    const acc = {
      reinvestimento: 0,
      caixa_loja: 0,
      salario: 0,
    };
    
    const movimentosCaixa = movimentosReg.filter(m => m.origem === 'caixa' && m.tipo === 'saida');
    console.log('🔍 saidasSub: Movimentos de caixa filtrados:', movimentosCaixa);
    
    movimentosCaixa.forEach((m, index) => {
      console.log(`🔍 saidasSub: [${index}] Processando movimento:`, {
        id: m.id,
        descricao: m.descricao,
        tipo: m.tipo,
        origem: m.origem,
        suborigem: m.suborigem,
        valor: m.valor
      });
      
      const key = (m.suborigem || 'reinvestimento') as keyof typeof acc;
      console.log(`🔍 saidasSub: [${index}] Chave calculada: ${key}`);
      console.log(`🔍 saidasSub: [${index}] Chaves disponíveis no acc:`, Object.keys(acc));
      console.log(`🔍 saidasSub: [${index}] acc[key] existe?`, acc[key] !== undefined);
      
      if (acc[key] !== undefined) {
        const valorAnterior = acc[key];
        acc[key] += m.valor;
        console.log(`🔍 saidasSub: [${index}] ✅ Adicionado ao ${key}: ${valorAnterior} + ${m.valor} = ${acc[key]}`);
      } else {
        console.log(`🔍 saidasSub: [${index}] ❌ Chave não encontrada: ${key}`);
        console.log(`🔍 saidasSub: [${index}] Tentando mapear manualmente...`);
        
        // Mapeamento manual para garantir compatibilidade
        if (m.suborigem === 'caixa_loja') {
          acc.caixa_loja += m.valor;
          console.log(`🔍 saidasSub: [${index}] ✅ Mapeado manualmente para caixa_loja: ${acc.caixa_loja}`);
        } else if (m.suborigem === 'salario') {
          acc.salario += m.valor;
          console.log(`🔍 saidasSub: [${index}] ✅ Mapeado manualmente para salario: ${acc.salario}`);
        } else if (m.suborigem === 'reinvestimento') {
          acc.reinvestimento += m.valor;
          console.log(`🔍 saidasSub: [${index}] ✅ Mapeado manualmente para reinvestimento: ${acc.reinvestimento}`);
        }
      }
    });
      
    console.log('🔍 saidasSub: ===== RESULTADO FINAL DAS SAÍDAS =====');
    console.log('🔍 saidasSub: Reinvestimento:', acc.reinvestimento);
    console.log('🔍 saidasSub: Caixa Loja:', acc.caixa_loja);
    console.log('🔍 saidasSub: Salário:', acc.salario);
    console.log('🔍 saidasSub: Total geral:', acc.reinvestimento + acc.caixa_loja + acc.salario);
      
    return acc;
  }, [movimentosReg]);

  // Cálculo das entradas por bucket (baseado no LUCRO TOTAL, não vendas)
  const bucketEntradas = useMemo(() => {
    const totalVendas = caixa.totalVendas; // Usar vendas totais para divisão
    const entradas = {
      reinvestimento: totalVendas * (divisaoCaixa.reinvestimento / 100),
      caixa_loja: totalVendas * (divisaoCaixa.caixaLoja / 100),
      salario: totalVendas * (divisaoCaixa.salario / 100),
    };
    
    console.log('🔍 bucketEntradas: Total Vendas:', totalVendas);
    console.log('🔍 bucketEntradas: Divisão:', divisaoCaixa);
    console.log('🔍 bucketEntradas: Entradas calculadas:', entradas);
    
    return entradas;
  }, [caixa.totalVendas, divisaoCaixa]);

  // Cálculo dos saldos por bucket
  const bucketSaldos = useMemo(() => {
    console.log('🔍 bucketSaldos: Calculando saldos...');
    console.log('🔍 bucketSaldos: Entradas (bucketEntradas):', bucketEntradas);
    console.log('🔍 bucketSaldos: Saídas (saidasSub):', saidasSub);
    
    const saldos = {
      reinvestimento: Math.max(0, bucketEntradas.reinvestimento - saidasSub.reinvestimento),
      caixa_loja: Math.max(0, bucketEntradas.caixa_loja - saidasSub.caixa_loja),
      salario: Math.max(0, bucketEntradas.salario - saidasSub.salario),
    };
    
    console.log('🔍 bucketSaldos: Cálculo detalhado:');
    console.log('  - Reinvestimento:', bucketEntradas.reinvestimento, '-', saidasSub.reinvestimento, '=', saldos.reinvestimento);
    console.log('  - Caixa Loja:', bucketEntradas.caixa_loja, '-', saidasSub.caixa_loja, '=', saldos.caixa_loja);
    console.log('  - Salário:', bucketEntradas.salario, '-', saidasSub.salario, '=', saldos.salario);
    console.log('🔍 bucketSaldos: Saldos finais:', saldos);
    
    return saldos;
  }, [bucketEntradas, saidasSub]);

  // Ajustar divisão com validação automática
  const ajustarDivisaoCaixa = (campo: keyof DivisaoCaixa, valor: number) => {
    // Apenas atualiza o campo (0..100) e salva; não ajusta automaticamente os demais.
    const novo = { ...divisaoCaixa, [campo]: Math.max(0, Math.min(100, valor)) };
    setDivisaoCaixa(novo);
    try {
      localStorage.setItem('fluxo_divisao_caixa', JSON.stringify(novo));
    } catch {}
  };

  // Funções utilitárias
  const formatarSuborigem = (v?: string) => {
    if (!v) return '';
    if (v === 'caixa_loja') return 'Caixa da Loja';
    if (v === 'salario') return 'Salário';
    return v.charAt(0).toUpperCase() + v.slice(1);
  };

  // Operações CRUD
  const registrarSaida = async () => {
    if (isViewer()) {
      showViewerAlertForAction('registrar saídas no fluxo de caixa');
      return;
    }
    
    console.log('🔍 registrarSaida: Iniciando registro de saída');
    console.log('🔍 registrarSaida: Form data:', form);
    console.log('🔍 registrarSaida: addMov function:', addMov);
    
    if (!form.descricao.trim() || form.valor <= 0) {
      console.log('❌ registrarSaida: Validação falhou - descrição ou valor inválido');
      alert('Por favor, preencha a descrição e um valor válido');
      return;
    }

    // VALIDAÇÃO DE SALDO DISPONÍVEL
    if (form.origem === 'caixa') {
      const subcategoria = form.suborigem || 'reinvestimento';
      const saldoDisponivel = bucketSaldos[subcategoria as keyof typeof bucketSaldos];
      
      console.log('🔍 registrarSaida: Validando saldo disponível');
      console.log('🔍 registrarSaida: Subcategoria:', subcategoria);
      console.log('🔍 registrarSaida: Saldo disponível:', saldoDisponivel);
      console.log('🔍 registrarSaida: Valor da saída:', form.valor);
      
      if (form.valor > saldoDisponivel) {
        console.log('❌ registrarSaida: Valor excede saldo disponível');
        const subcategoriaNome = formatarSuborigem(subcategoria);
        alert(`❌ Valor insuficiente!\n\nSaldo disponível em ${subcategoriaNome}: ${formatarMoeda(saldoDisponivel)}\nValor solicitado: ${formatarMoeda(form.valor)}\n\nAjuste o valor ou escolha outra subcategoria.`);
        return;
      }
    } else if (form.origem === 'embalagem') {
      const saldoEmbalagem = caixa.saldoEmbalagem;
      
      console.log('🔍 registrarSaida: Validando saldo de embalagem');
      console.log('🔍 registrarSaida: Saldo embalagem:', saldoEmbalagem);
      console.log('🔍 registrarSaida: Valor da saída:', form.valor);
      
      if (form.valor > saldoEmbalagem) {
        console.log('❌ registrarSaida: Valor excede saldo de embalagem');
        alert(`❌ Valor insuficiente!\n\nSaldo disponível em Embalagem: ${formatarMoeda(saldoEmbalagem)}\nValor solicitado: ${formatarMoeda(form.valor)}\n\nAjuste o valor.`);
        return;
      }
    }
    
    try {
      setSaving(true);
      console.log('🔍 registrarSaida: Salvando...');
      
      const payload: any = {
        data: new Date(`${form.data}T12:00:00`),
        descricao: toTitleCase(form.descricao.trim()),
        tipo: 'saida',
        origem: form.origem,
        valor: form.valor,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      if (form.origem === 'caixa') {
        payload.suborigem = form.suborigem || 'reinvestimento';
      }
      
      console.log('🔍 registrarSaida: Payload criado:', payload);
      console.log('🔍 registrarSaida: Chamando addMov...');
      
      const result = await addMov(payload as Movimento);
      console.log('🔍 registrarSaida: addMov retornou:', result);
      
      if (result) {
        console.log('✅ registrarSaida: Saída registrada com sucesso!');
        setSuccessMessage(`✅ Saída de ${formatarMoeda(form.valor)} registrada com sucesso!`);
        setShowSuccessModal(true);
      setForm({ data: new Date().toISOString().split('T')[0], descricao: '', origem: 'caixa', valor: 0, suborigem: 'reinvestimento' });
        
        // Permanecer na aba Fluxo; atualizará automaticamente via onSnapshot
      } else {
        console.log('❌ registrarSaida: Falha ao registrar saída');
        setSuccessMessage('❌ Erro ao registrar saída. Verifique o console para mais detalhes.');
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('❌ registrarSaida: Erro ao registrar saída:', error);
      setSuccessMessage('❌ Erro ao registrar saída: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
      setShowSuccessModal(true);
    } finally {
      setSaving(false);
    }
  };

  const abrirEdicao = (m: Movimento) => {
    if (isViewer()) {
      showViewerAlertForAction('editar movimentações do fluxo de caixa');
      return;
    }
    setEditing(m);
    setEditForm({
      data: new Date(m.data).toISOString().split('T')[0],
      descricao: m.descricao,
      origem: m.origem,
      valor: m.valor,
      suborigem: (m as any).suborigem,
    });
  };

  const salvarEdicao = async () => {
    if (!editing) return;
    if (!editForm.descricao.trim() || editForm.valor <= 0) return;

    // VALIDAÇÃO DE SALDO DISPONÍVEL (para edição)
    if (editForm.origem === 'caixa') {
      const subcategoria = editForm.suborigem || 'reinvestimento';
      const saldoDisponivel = bucketSaldos[subcategoria as keyof typeof bucketSaldos];
      
      // Calcular o valor atual da movimentação sendo editada para subtrair do cálculo
      const valorAtualMovimento = editing.valor;
      const saldoDisponivelComEdicao = saldoDisponivel + valorAtualMovimento;
      
      console.log('🔍 salvarEdicao: Validando saldo disponível');
      console.log('🔍 salvarEdicao: Subcategoria:', subcategoria);
      console.log('🔍 salvarEdicao: Saldo disponível:', saldoDisponivel);
      console.log('🔍 salvarEdicao: Valor atual da movimentação:', valorAtualMovimento);
      console.log('🔍 salvarEdicao: Saldo disponível com edição:', saldoDisponivelComEdicao);
      console.log('🔍 salvarEdicao: Novo valor:', editForm.valor);
      
      if (editForm.valor > saldoDisponivelComEdicao + 0.01) {
        console.log('❌ salvarEdicao: Valor excede saldo disponível');
        const subcategoriaNome = formatarSuborigem(subcategoria);
        alert(`❌ Valor insuficiente!\n\nSaldo disponível em ${subcategoriaNome}: ${formatarMoeda(saldoDisponivelComEdicao)}\nValor solicitado: ${formatarMoeda(editForm.valor)}\n\nAjuste o valor ou escolha outra subcategoria.`);
        return;
      }
    } else if (editForm.origem === 'embalagem') {
      const saldoEmbalagem = caixa.saldoEmbalagem;
      
      // Calcular o valor atual da movimentação sendo editada para subtrair do cálculo
      const valorAtualMovimento = editing.valor;
      const saldoEmbalagemComEdicao = saldoEmbalagem + valorAtualMovimento;
      
      console.log('🔍 salvarEdicao: Validando saldo de embalagem');
      console.log('🔍 salvarEdicao: Saldo embalagem:', saldoEmbalagem);
      console.log('🔍 salvarEdicao: Valor atual da movimentação:', valorAtualMovimento);
      console.log('🔍 salvarEdicao: Saldo embalagem com edição:', saldoEmbalagemComEdicao);
      console.log('🔍 salvarEdicao: Novo valor:', editForm.valor);
      
      if (editForm.valor > saldoEmbalagemComEdicao + 0.01) {
        console.log('❌ salvarEdicao: Valor excede saldo de embalagem');
        alert(`❌ Valor insuficiente!\n\nSaldo disponível em Embalagem: ${formatarMoeda(saldoEmbalagemComEdicao)}\nValor solicitado: ${formatarMoeda(editForm.valor)}\n\nAjuste o valor.`);
        return;
      }
    }
    
    const updates: any = {
      data: new Date(`${editForm.data}T12:00:00`),
      descricao: toTitleCase(editForm.descricao.trim()),
      origem: editForm.origem,
      valor: editForm.valor,
      updatedAt: new Date()
    };
    
    if (editForm.origem === 'caixa') {
      updates.suborigem = editForm.suborigem || 'reinvestimento';
    } else {
      updates.suborigem = null;
    }
    
    await updateMov(editing.id, updates as any);
    setEditing(null);
  };

  const confirmarExclusao = (m: Movimento) => {
    if (isViewer()) {
      showViewerAlertForAction('excluir movimentações do fluxo de caixa');
      return;
    }
    setMovimentoToDelete(m);
    setShowDeleteModal(true);
  };

  const excluirMov = async () => {
    if (!movimentoToDelete) return;
    
    try {
      console.log('🔍 excluirMov: Excluindo movimento:', movimentoToDelete.id);
      await removeMov(movimentoToDelete.id);
      
      setSuccessMessage(`✅ Movimentação "${movimentoToDelete.descricao}" excluída com sucesso!`);
      setShowSuccessModal(true);
      setShowDeleteModal(false);
      setMovimentoToDelete(null);
      
      // Permanecer na aba Fluxo; atualizará automaticamente via onSnapshot
    } catch (error) {
      console.error('❌ excluirMov: Erro ao excluir movimento:', error);
      setSuccessMessage('❌ Erro ao excluir movimentação. Verifique o console para mais detalhes.');
      setShowSuccessModal(true);
      setShowDeleteModal(false);
    }
  };

  // Mostrar loading se os dados ainda estão carregando
  if (vendasLoading || movimentosLoading || !vendasInitialized || !movimentosInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            <p className="mt-4 text-gray-600 text-lg">Carregando fluxo de caixa...</p>
            <p className="text-sm text-gray-500">Aguarde enquanto os dados são atualizados</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header - Mobile */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:hidden" style={{width: '115%', margin: '0 auto', marginLeft: '-30px'}}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-2 rounded-lg mr-3">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Fluxo de Caixa</h2>
                <p className="text-sm text-gray-600">Controle de vendas e saídas por categoria</p>
              </div>
            </div>
          </div>
        </div>

        {/* Header - Desktop */}
        <div className="hidden sm:block bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-2 rounded-lg mr-3">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Fluxo de Caixa</h2>
                <p className="text-sm text-gray-600">Controle de vendas e saídas por categoria</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card Total Vendas - Mobile */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:hidden" style={{width: '115%', margin: '0 auto', marginLeft: '-30px'}}>
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Vendas</p>
                <p className="text-lg font-bold text-green-600">{formatarMoeda(caixa.totalVendas)}</p>
              </div>
            </div>
          </div>

          {/* Card Total Vendas - Desktop */}
          <div className="hidden sm:block bg-white rounded-xl shadow-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Vendas</p>
                <p className="text-lg font-bold text-green-600">{formatarMoeda(caixa.totalVendas)}</p>
              </div>
            </div>
          </div>


          {/* Card Saldo Caixa - Mobile */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:hidden" style={{width: '115%', margin: '0 auto', marginLeft: '-30px'}}>
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Wallet className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Saldo Caixa</p>
                <p className="text-lg font-bold text-purple-600">{formatarMoeda(caixa.saldoCaixa)}</p>
              </div>
            </div>
          </div>

          {/* Card Saldo Caixa - Desktop */}
          <div className="hidden sm:block bg-white rounded-xl shadow-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Wallet className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Saldo Caixa</p>
                <p className="text-lg font-bold text-purple-600">{formatarMoeda(caixa.saldoCaixa)}</p>
              </div>
            </div>
          </div>

          {/* Card Saldo Embalagem - Mobile */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:hidden" style={{width: '115%', margin: '0 auto', marginLeft: '-30px'}}>
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Package className="h-5 w-5 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Saldo Embalagem</p>
                <p className="text-lg font-bold text-orange-600">{formatarMoeda(caixa.saldoEmbalagem)}</p>
              </div>
            </div>
          </div>

          {/* Card Saldo Embalagem - Desktop */}
          <div className="hidden sm:block bg-white rounded-xl shadow-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Package className="h-5 w-5 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Saldo Embalagem</p>
                <p className="text-lg font-bold text-orange-600">{formatarMoeda(caixa.saldoEmbalagem)}</p>
              </div>
            </div>
          </div>

          {/* Card Saídas Caixa - Mobile */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:hidden" style={{width: '115%', margin: '0 auto', marginLeft: '-30px'}}>
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <MinusCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Saídas Caixa</p>
                <p className="text-lg font-bold text-red-600">{formatarMoeda(caixa.saidasCaixa)}</p>
              </div>
            </div>
          </div>

          {/* Card Saídas Caixa - Desktop */}
          <div className="hidden sm:block bg-white rounded-xl shadow-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <MinusCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Saídas Caixa</p>
                <p className="text-lg font-bold text-red-600">{formatarMoeda(caixa.saidasCaixa)}</p>
              </div>
            </div>
          </div>

          {/* Card Valores Pendentes - Mobile */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:hidden" style={{width: '115%', margin: '0 auto', marginLeft: '-30px'}}>
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Valores Pendentes</p>
                <p className="text-lg font-bold text-yellow-600">{formatarMoeda(caixa.valoresPendentes)}</p>
              </div>
            </div>
          </div>

          {/* Card Valores Pendentes - Desktop */}
          <div className="hidden sm:block bg-white rounded-xl shadow-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Valores Pendentes</p>
                <p className="text-lg font-bold text-yellow-600">{formatarMoeda(caixa.valoresPendentes)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Seção Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulário de Registro - Mobile */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:hidden" style={{width: '115%', margin: '0 auto', marginLeft: '-30px'}}>
            <div className="flex items-center mb-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg mr-3">
                <PlusCircle className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Registrar Saída</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data</label>
                <input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm(prev => ({ ...prev, data: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                <input
                  type="text"
                  value={form.descricao}
                  onChange={(e) => setForm(prev => ({ ...prev, descricao: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  placeholder="Ex: Compra de material"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Origem</label>
                <select
                  value={form.origem}
                  onChange={(e) => setForm(prev => ({ ...prev, origem: e.target.value as Movimento['origem'] }))}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="caixa">Caixa</option>
                  <option value="embalagem">Embalagem</option>
                </select>
              </div>

              {form.origem === 'caixa' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subcategoria</label>
                   <select
                     value={form.suborigem || 'reinvestimento'}
                     onChange={(e) => setForm(prev => ({ ...prev, suborigem: e.target.value as Movimento['suborigem'] }))}
                     className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                   >
                     <option value="reinvestimento">Reinvestimento</option>
                     <option value="caixa_loja">Caixa da Loja</option>
                     <option value="salario">Salário</option>
                   </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valor</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valor}
                  onChange={(e) => setForm(prev => ({ ...prev, valor: parseFloat(e.target.value) || 0 }))}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
                {form.origem === 'caixa' && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-700">
                        Saldo disponível em {formatarSuborigem(form.suborigem || 'reinvestimento')}:
                      </span>
                      <span className={`text-sm font-bold ${(form.valor > (bucketSaldos[form.suborigem as keyof typeof bucketSaldos] || 0)) ? 'text-red-600' : 'text-blue-600'}`}>
                        {formatarMoeda(bucketSaldos[form.suborigem as keyof typeof bucketSaldos] || 0)}
                      </span>
                    </div>
                    {form.valor > (bucketSaldos[form.suborigem as keyof typeof bucketSaldos] || 0) && (
                      <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded-lg">
                        <p className="text-xs text-red-700 font-medium">
                          ⚠️ Valor excede o saldo disponível!
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {form.origem === 'embalagem' && (
                  <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-orange-700">
                        Saldo disponível em Embalagem:
                      </span>
                      <span className={`text-sm font-bold ${(form.valor > caixa.saldoEmbalagem) ? 'text-red-600' : 'text-orange-600'}`}>
                        {formatarMoeda(caixa.saldoEmbalagem)}
                      </span>
                    </div>
                    {form.valor > caixa.saldoEmbalagem && (
                      <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded-lg">
                        <p className="text-xs text-red-700 font-medium">
                          ⚠️ Valor excede o saldo disponível!
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={registrarSaida}
                disabled={saving || !form.descricao.trim() || form.valor <= 0}
                className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : 'Registrar Saída'}
              </button>
            </div>
          </div>

          {/* Formulário de Registro - Desktop */}
          <div className="hidden sm:block bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg mr-3">
                <PlusCircle className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Registrar Saída</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data</label>
                <input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm({ ...form, data: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                <input
                  type="text"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Ex: Compra de material, pagamento de conta..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Origem</label>
                <select
                  value={form.origem}
                  onChange={(e) => setForm({ ...form, origem: e.target.value as 'caixa' | 'embalagem' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="caixa">Caixa</option>
                  <option value="embalagem">Embalagem</option>
                </select>
              </div>

              {form.origem === 'caixa' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subcategoria</label>
                  <select
                    value={form.suborigem}
                    onChange={(e) => setForm({ ...form, suborigem: e.target.value as 'reinvestimento' | 'caixa_loja' | 'salario' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="reinvestimento">Reinvestimento</option>
                    <option value="caixa_loja">Caixa da Loja</option>
                    <option value="salario">Salário</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valor</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Digite o valor"
                />
              </div>

               {form.origem === 'caixa' && form.suborigem && (
                 <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                   <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                     <span className="text-sm font-medium text-blue-700">
                       Saldo disponível em {formatarSuborigem(form.suborigem || 'reinvestimento')}:
                     </span>
                     <span className={`text-sm font-bold ${(form.valor > (bucketSaldos[form.suborigem as keyof typeof bucketSaldos] || 0)) ? 'text-red-600' : 'text-blue-600'}`}>
                       {formatarMoeda(bucketSaldos[form.suborigem as keyof typeof bucketSaldos] || 0)}
                     </span>
                   </div>
                  {form.valor > (bucketSaldos[form.suborigem as keyof typeof bucketSaldos] || 0) + 0.001 && (
                    <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded-lg">
                      <p className="text-xs text-red-700 font-medium">
                        ⚠️ Valor excede o saldo disponível!
                      </p>
                    </div>
                  )}
                </div>
              )}
              {form.origem === 'embalagem' && (
                <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-orange-700">
                      Saldo disponível em Embalagem:
                    </span>
                    <span className={`text-sm font-bold ${(form.valor > caixa.saldoEmbalagem) ? 'text-red-600' : 'text-orange-600'}`}>
                      {formatarMoeda(caixa.saldoEmbalagem)}
                    </span>
                  </div>
                  {form.valor > caixa.saldoEmbalagem + 0.001 && (
                    <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded-lg">
                      <p className="text-xs text-red-700 font-medium">
                        ⚠️ Valor excede o saldo disponível!
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={registrarSaida}
                disabled={saving || !form.descricao.trim() || form.valor <= 0}
                className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : 'Registrar Saída'}
              </button>
            </div>
          </div>

          {/* Lista de Movimentações - Mobile */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:hidden" style={{width: '115%', margin: '0 auto', marginLeft: '-30px'}}>
            <div className="flex items-center mb-4">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg mr-3">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Movimentações</h3>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {movimentosReg.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MinusCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg">Nenhuma movimentação</p>
                  <p className="text-sm">Registre saídas para ver o histórico</p>
                </div>
              ) : (
                (() => {
                  console.log('🔍 DEBUG: movimentosReg:', movimentosReg);
                  return movimentosReg
                    .sort((a, b) => {
                      const dateA = a.data instanceof Date ? a.data : new Date(a.data);
                      const dateB = b.data instanceof Date ? b.data : new Date(b.data);
                      return dateB.getTime() - dateA.getTime();
                    })
                    .map(movimento => {
                      console.log('🔍 DEBUG: movimento individual:', movimento);
                      return (
                    <div key={movimento.id} className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                      <div className="space-y-2">
                        {/* Linha 1: Descrição e Valor */}
                      <div className="flex justify-between items-start">
                          <h4 className="font-medium text-gray-900 text-sm flex-1 pr-2">{movimento.descricao}</h4>
                          <p className="text-sm font-bold text-red-600 whitespace-nowrap">
                            -{(() => {
                              try {
                                const valor = Number(movimento.valor);
                                if (isNaN(valor) || valor === 0) {
                                  return 'R$ 0,00';
                                }
                                return formatarMoeda(valor);
                              } catch (error) {
                                console.error('Erro ao formatar valor:', error, movimento.valor);
                                return 'R$ 0,00';
                              }
                            })()}
                          </p>
                        </div>
                        
                        {/* Linha 2: Tags */}
                        <div className="flex flex-wrap gap-1">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {movimento.origem}
                            </span>
                            {movimento.suborigem && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {formatarSuborigem(movimento.suborigem)}
                              </span>
                            )}
                          </div>
                        
                        {/* Linha 3: Data e Ações */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center text-xs text-gray-600">
                            <Calendar className="h-3 w-3 mr-1" />
                            {(() => {
                              try {
                                let date = movimento.data;
                                
                                // Se for um timestamp do Firebase, converter para Date
                                if (date && typeof date === 'object' && date.toDate) {
                                  date = date.toDate();
                                }
                                
                                // Se for uma string, tentar converter para Date
                                if (typeof date === 'string') {
                                  date = new Date(date);
                                }
                                
                                // Se não for um objeto Date válido, criar um novo Date
                                if (!(date instanceof Date) || isNaN(date.getTime())) {
                                  console.warn('Data inválida recebida:', movimento.data);
                                  return 'Data inválida';
                                }
                                
                                return date.toLocaleDateString('pt-BR');
                              } catch (error) {
                                console.error('Erro ao formatar data:', error, movimento.data);
                                return 'Data inválida';
                              }
                            })()}
                          </div>
                          <div className="flex space-x-1">
                          <button
                            onClick={() => abrirEdicao(movimento)}
                            className="p-1 text-yellow-600 hover:bg-yellow-100 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => confirmarExclusao(movimento)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          </div>
                        </div>
                      </div>
                    </div>
                      );
                    });
                })()
              )}
            </div>
          </div>

          {/* Lista de Movimentações - Desktop */}
          <div className="hidden sm:block bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg mr-3">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Movimentações</h3>
        </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {movimentosReg.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhuma movimentação registrada</p>
                </div>
              ) : (
                (() => {
                  const movimentacoesOrdenadas = [...movimentosReg].sort((a, b) => 
                    new Date(b.data).getTime() - new Date(a.data).getTime()
                  );
                  
                  return movimentacoesOrdenadas.map((movimento) => {
                    const isEntrada = false; // Movimento só tem tipo 'saida'
                    const isPendente = movimento.status === 'pendente';
                    
                    return (
                      <div key={movimento.id} className={`p-4 rounded-lg border-l-4 ${
                        isEntrada 
                          ? 'bg-green-50 border-green-400' 
                          : 'bg-red-50 border-red-400'
                      } ${isPendente ? 'opacity-75' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className={`text-sm font-medium ${
                                isEntrada ? 'text-green-800' : 'text-red-800'
                              }`}>
                                {isEntrada ? 'Entrada' : 'Saída'}
                              </span>
                              {isPendente && (
                                <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                                  Pendente
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 font-medium">{movimento.descricao}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-xs text-gray-500">
                                {(() => {
                                  try {
                                    let date = movimento.data;
                                    
                                    // Se for um timestamp do Firebase, converter para Date
                                    if (date && typeof date === 'object' && date.toDate) {
                                      date = date.toDate();
                                    }
                                    
                                    // Se for uma string, tentar converter para Date
                                    if (typeof date === 'string') {
                                      date = new Date(date);
                                    }
                                    
                                    // Se não for um objeto Date válido, criar um novo Date
                                    if (!(date instanceof Date) || isNaN(date.getTime())) {
                                      return 'Data inválida';
                                    }
                                    
                                    return date.toLocaleDateString('pt-BR');
                                  } catch (error) {
                                    return 'Data inválida';
                                  }
                                })()}
                              </span>
                              <span className={`text-sm font-bold ${
                                isEntrada ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {isEntrada ? '+' : '-'} {formatarMoeda(movimento.valor)}
                              </span>
                              {movimento.origem && (
                                <span className="text-xs text-gray-500">
                                  {movimento.origem === 'caixa' ? 'Caixa' : 'Embalagem'}
                                  {movimento.suborigem && ` • ${formatarSuborigem(movimento.suborigem)}`}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => confirmarExclusao(movimento)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>
        </div>

        {/* Seção de Divisão de Saldos - Mobile */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:hidden" style={{width: '115%', margin: '0 auto', marginLeft: '-30px'}}>
          <div className="flex items-center mb-6">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-lg mr-3">
              <Target className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Divisão do Caixa</h3>
          </div>

           {/* Inputs de Percentual */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">Reinvestimento (%)</label>
               <input
                 type="number"
                 min="0"
                 max="100"
                 value={divisaoCaixa.reinvestimento}
                 onChange={(e) => ajustarDivisaoCaixa('reinvestimento', parseFloat(e.target.value) || 0)}
                 className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">Caixa da Loja (%)</label>
               <input
                 type="number"
                 min="0"
                 max="100"
                 value={divisaoCaixa.caixaLoja}
                 onChange={(e) => ajustarDivisaoCaixa('caixaLoja', parseFloat(e.target.value) || 0)}
                 className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">Salário (%)</label>
               <input
                 type="number"
                 min="0"
                 max="100"
                 value={divisaoCaixa.salario}
                 onChange={(e) => ajustarDivisaoCaixa('salario', parseFloat(e.target.value) || 0)}
                 className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
               />
             </div>
           </div>

           {/* Soma das Divisões */}
           <div className={`mb-6 p-4 rounded-lg border-2 ${(divisaoCaixa.reinvestimento + divisaoCaixa.caixaLoja + divisaoCaixa.salario) === 100 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
             <div className="flex items-center justify-between">
               <span className="text-sm font-medium text-gray-700">Total das Divisões:</span>
               <span className={`text-lg font-bold ${(divisaoCaixa.reinvestimento + divisaoCaixa.caixaLoja + divisaoCaixa.salario) === 100 ? 'text-green-600' : 'text-red-600'}`}>
                 {divisaoCaixa.reinvestimento + divisaoCaixa.caixaLoja + divisaoCaixa.salario}%
               </span>
             </div>
             {(divisaoCaixa.reinvestimento + divisaoCaixa.caixaLoja + divisaoCaixa.salario) !== 100 && (
               <div className="mt-2 p-3 bg-red-100 border border-red-300 rounded-lg">
                 <p className="text-sm text-red-700 font-medium">
                   ⚠️ A soma deve ser exatamente 100%
                 </p>
                 <p className="text-xs text-red-600 mt-1">
                   Ajuste os percentuais para que a soma seja 100% antes de continuar
                 </p>
               </div>
             )}
             {(divisaoCaixa.reinvestimento + divisaoCaixa.caixaLoja + divisaoCaixa.salario) === 100 && (
               <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded-lg">
                 <p className="text-sm text-green-700 font-medium">
                   ✅ Divisão configurada corretamente
                 </p>
               </div>
             )}
           </div>

           {/* Cards de Saldos por Categoria */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
               <h4 className="font-medium text-blue-900 mb-2">Reinvestimento</h4>
               <p className="text-2xl font-bold text-blue-600">{formatarMoeda(bucketSaldos.reinvestimento)}</p>
               <p className="text-sm text-blue-700">Saídas: {formatarMoeda(saidasSub.reinvestimento)}</p>
             </div>

             <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
               <h4 className="font-medium text-green-900 mb-2">Caixa da Loja</h4>
               <p className="text-2xl font-bold text-green-600">{formatarMoeda(bucketSaldos.caixa_loja)}</p>
               <p className="text-sm text-green-700">Saídas: {formatarMoeda(saidasSub.caixa_loja)}</p>
             </div>

             <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
               <h4 className="font-medium text-purple-900 mb-2">Salário</h4>
               <p className="text-2xl font-bold text-purple-600">{formatarMoeda(bucketSaldos.salario)}</p>
               <p className="text-sm text-purple-700">Saídas: {formatarMoeda(saidasSub.salario)}</p>
             </div>
           </div>
        </div>

        {/* Seção de Divisão de Saldos - Desktop */}
        <div className="hidden sm:block bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-lg mr-3">
              <Target className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Divisão do Caixa</h3>
          </div>

           {/* Inputs de Percentual */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">Reinvestimento (%)</label>
               <input
                 type="number"
                 min="0"
                 max="100"
                 value={divisaoCaixa.reinvestimento}
                 onChange={(e) => ajustarDivisaoCaixa('reinvestimento', parseFloat(e.target.value) || 0)}
                 className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">Caixa da Loja (%)</label>
               <input
                 type="number"
                 min="0"
                 max="100"
                 value={divisaoCaixa.caixaLoja}
                 onChange={(e) => ajustarDivisaoCaixa('caixaLoja', parseFloat(e.target.value) || 0)}
                 className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">Salário (%)</label>
               <input
                 type="number"
                 min="0"
                 max="100"
                 value={divisaoCaixa.salario}
                 onChange={(e) => ajustarDivisaoCaixa('salario', parseFloat(e.target.value) || 0)}
                 className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
               />
             </div>
           </div>

           {/* Soma das Divisões */}
           <div className={`mb-6 p-4 rounded-lg border-2 ${(divisaoCaixa.reinvestimento + divisaoCaixa.caixaLoja + divisaoCaixa.salario) === 100 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
             <div className="flex items-center justify-between">
               <span className="text-sm font-medium text-gray-700">Total das Divisões:</span>
               <span className={`text-lg font-bold ${(divisaoCaixa.reinvestimento + divisaoCaixa.caixaLoja + divisaoCaixa.salario) === 100 ? 'text-green-600' : 'text-red-600'}`}>
                 {divisaoCaixa.reinvestimento + divisaoCaixa.caixaLoja + divisaoCaixa.salario}%
               </span>
             </div>
             {(divisaoCaixa.reinvestimento + divisaoCaixa.caixaLoja + divisaoCaixa.salario) !== 100 && (
               <div className="mt-2 p-3 bg-red-100 border border-red-300 rounded-lg">
                 <p className="text-sm text-red-700 font-medium">
                   ⚠️ A soma deve ser exatamente 100%
                 </p>
                 <p className="text-xs text-red-600 mt-1">
                   Ajuste os percentuais para que a soma seja 100% antes de continuar
                 </p>
               </div>
             )}
             {(divisaoCaixa.reinvestimento + divisaoCaixa.caixaLoja + divisaoCaixa.salario) === 100 && (
               <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded-lg">
                 <p className="text-sm text-green-700 font-medium">
                   ✅ Divisão configurada corretamente
                 </p>
               </div>
             )}
           </div>

           {/* Cards de Saldos por Categoria */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
               <h4 className="font-medium text-blue-900 mb-2">Reinvestimento</h4>
               <p className="text-2xl font-bold text-blue-600">{formatarMoeda(bucketSaldos.reinvestimento)}</p>
               <p className="text-sm text-blue-700">Saídas: {formatarMoeda(saidasSub.reinvestimento)}</p>
             </div>

             <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
               <h4 className="font-medium text-green-900 mb-2">Caixa da Loja</h4>
               <p className="text-2xl font-bold text-green-600">{formatarMoeda(bucketSaldos.caixa_loja)}</p>
               <p className="text-sm text-green-700">Saídas: {formatarMoeda(saidasSub.caixa_loja)}</p>
             </div>

             <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
               <h4 className="font-medium text-purple-900 mb-2">Salário</h4>
               <p className="text-2xl font-bold text-purple-600">{formatarMoeda(bucketSaldos.salario)}</p>
               <p className="text-sm text-purple-700">Saídas: {formatarMoeda(saidasSub.salario)}</p>
             </div>
           </div>
        </div>

        {/* Modal de Edição */}
        {editing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Editar Movimentação</h3>
                  <button
                    onClick={() => setEditing(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data</label>
                  <input
                    type="date"
                    value={editForm.data}
                    onChange={(e) => setEditForm(prev => ({ ...prev, data: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                  <input
                    type="text"
                    value={editForm.descricao}
                    onChange={(e) => setEditForm(prev => ({ ...prev, descricao: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Origem</label>
                  <select
                    value={editForm.origem}
                    onChange={(e) => setEditForm(prev => ({ ...prev, origem: e.target.value as Movimento['origem'] }))}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  >
                    <option value="caixa">Caixa</option>
                    <option value="embalagem">Embalagem</option>
                  </select>
                </div>

                {editForm.origem === 'caixa' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subcategoria</label>
                     <select
                       value={editForm.suborigem || 'reinvestimento'}
                       onChange={(e) => setEditForm(prev => ({ ...prev, suborigem: e.target.value as Movimento['suborigem'] }))}
                       className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                     >
                       <option value="reinvestimento">Reinvestimento</option>
                       <option value="caixa_loja">Caixa da Loja</option>
                       <option value="salario">Salário</option>
                     </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Valor</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.valor}
                    onChange={(e) => setEditForm(prev => ({ ...prev, valor: parseFloat(e.target.value) || 0 }))}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                  {editForm.origem === 'caixa' && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-700">
                          Saldo disponível em {formatarSuborigem(editForm.suborigem || 'reinvestimento')}:
                        </span>
                        <span className={`text-sm font-bold ${(editForm.valor > ((bucketSaldos[editForm.suborigem as keyof typeof bucketSaldos] || 0) + editing.valor) + 0.01) ? 'text-red-600' : 'text-blue-600'}`}>
                          {formatarMoeda((bucketSaldos[editForm.suborigem as keyof typeof bucketSaldos] || 0) + editing.valor)}
                        </span>
                      </div>
                      {editForm.valor > ((bucketSaldos[editForm.suborigem as keyof typeof bucketSaldos] || 0) + editing.valor) + 0.01 && (
                        <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded-lg">
                          <p className="text-xs text-red-700 font-medium">
                            ⚠️ Valor excede o saldo disponível!
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  {editForm.origem === 'embalagem' && (
                    <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-orange-700">
                          Saldo disponível em Embalagem:
                        </span>
                        <span className={`text-sm font-bold ${(editForm.valor > (caixa.saldoEmbalagem + editing.valor) + 0.01) ? 'text-red-600' : 'text-orange-600'}`}>
                          {formatarMoeda(caixa.saldoEmbalagem + editing.valor)}
                        </span>
                      </div>
                      {editForm.valor > (caixa.saldoEmbalagem + editing.valor) + 0.01 && (
                        <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded-lg">
                          <p className="text-xs text-red-700 font-medium">
                            ⚠️ Valor excede o saldo disponível!
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setEditing(null)}
                    className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={salvarEdicao}
                    disabled={!editForm.descricao.trim() || editForm.valor <= 0}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão */}
        {showDeleteModal && movimentoToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-red-400 to-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Confirmar Exclusão
                </h3>
                
                <p className="text-gray-600 mb-2 text-lg">
                  Tem certeza que deseja excluir esta movimentação?
                </p>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <p className="font-semibold text-gray-800">{movimentoToDelete.descricao}</p>
                  <p className="text-sm text-gray-600">
                    {formatarMoeda(movimentoToDelete.valor)} • {formatarSuborigem(movimentoToDelete.suborigem)}
                  </p>
                </div>
                
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setMovimentoToDelete(null);
                    }}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-200 font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={excluirMov}
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Sucesso */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {successMessage.includes('✅') ? 'Sucesso!' : 'Atenção!'}
                </h3>
                
                <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                  {successMessage}
                </p>
                
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    {successMessage.includes('✅') ? 'Continuar' : 'Entendi'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Alerta para Visualizador */}
        <ViewerAlert
          isVisible={showViewerAlert}
          onClose={() => setShowViewerAlert(false)}
          action={viewerAlertAction}
        />
      </div>
    </div>
  );
}