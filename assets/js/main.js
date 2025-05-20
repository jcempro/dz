let salvarAuto = false;

const formatarMoeda = valor => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const atualizarResultados = () => {
  const valores = [...document.querySelectorAll('[data-valor]')].map(el => parseFloat(el.getAttribute('data-raw')) || 0);
  const soma = valores.reduce((acc, v) => acc + v, 0);
  const ofertaPct = Math.max(0, Math.min(75, parseFloat(document.getElementById('oferta').value) || 0));
  const correcaoPct = Math.max(0, Math.min(10, parseFloat(document.getElementById('correcao').value) || 0));
  const dizimo = soma * 0.10;
  const dizimoCorrigido = dizimo * (1 + correcaoPct / 100);
  const oferta = soma * (ofertaPct / 100);
  const total = dizimoCorrigido + oferta;

  document.getElementById('soma').textContent = formatarMoeda(soma);
  document.getElementById('dizimo').textContent = formatarMoeda(dizimo);
  document.getElementById('dizimoCorrigido').textContent = formatarMoeda(dizimoCorrigido);
  document.getElementById('ofertaValor').textContent = formatarMoeda(oferta);
  document.getElementById('totalFinal').textContent = formatarMoeda(total);

  if (salvarAuto) salvarDados(false);
};

const formatarEAtualizar = e => {
  let input = e.target;
  let valor = input.value.replace(/[^\d]/g, '');
  valor = (parseInt(valor || '0') / 100).toFixed(2);
  input.setAttribute('data-raw', valor);
  input.value = formatarMoeda(valor);
  atualizarResultados();
};

const adicionarCampo = () => {
  const nome = prompt("Informe o nome do novo campo de recebimento:", "Nova Receita") || 'Nova Receita';
  const div = document.createElement('div');
  div.className = 'receita-item';
  div.innerHTML = `
        <i class="fa fa-circle"></i>
        <span class="label-edit" contenteditable="true">${nome}</span>
        <input type="text" class="valor" data-valor data-raw="0" value="R$ 0,00" />
        <i class="fa fa-minus remove-btn" onclick="removerCampo(this)"></i>
      `;
  div.querySelector('[data-valor]').addEventListener('input', formatarEAtualizar);
  div.querySelector('.label-edit').addEventListener('focus', e => e.target.classList.add('editing'));
  div.querySelector('.label-edit').addEventListener('blur', e => e.target.classList.remove('editing'));
  document.getElementById('recebimentos').appendChild(div);
};

const removerCampo = (el) => {
  el.closest('.receita-item').remove();
  atualizarResultados();
};

const salvarDados = (mostrar = true) => {
  const campos = [...document.querySelectorAll('#recebimentos .receita-item')].map(item => ({
    nome: item.querySelector('.label-edit').textContent.trim(),
    valor: parseFloat(item.querySelector('[data-valor]').getAttribute('data-raw')) || 0
  }));

  const dados = {
    campos,
    oferta: parseFloat(document.getElementById('oferta').value) || 0,
    correcao: parseFloat(document.getElementById('correcao').value) || 0
  };

  localStorage.setItem('dizimoDados', JSON.stringify(dados));
  if (mostrar) alert('Dados salvos com sucesso.');
};

const carregarDados = () => {
  const dados = JSON.parse(localStorage.getItem('dizimoDados'));
  if (!dados || !dados.campos) {
    alert('Nenhum dado salvo encontrado.');
    return;
  }

  document.getElementById('recebimentos').innerHTML = '';
  dados.campos.forEach(({ nome, valor }) => {
    const div = document.createElement('div');
    div.className = 'receita-item';
    div.innerHTML = `
          <i class="fa fa-circle"></i>
          <span class="label-edit" contenteditable="true">${nome}</span>
          <input type="text" class="valor" data-valor data-raw="${valor}" value="${formatarMoeda(valor)}" />
          <i class="fa fa-minus remove-btn" onclick="removerCampo(this)"></i>
        `;
    div.querySelector('[data-valor]').addEventListener('input', formatarEAtualizar);
    div.querySelector('.label-edit').addEventListener('focus', e => e.target.classList.add('editing'));
    div.querySelector('.label-edit').addEventListener('blur', e => e.target.classList.remove('editing'));
    document.getElementById('recebimentos').appendChild(div);
  });

  document.getElementById('oferta').value = dados.oferta;
  document.getElementById('correcao').value = dados.correcao;
  atualizarResultados();
};

const toggleSalvarAutomatico = () => {
  salvarAuto = !salvarAuto;
  alert('Salvar automático ' + (salvarAuto ? 'ativado' : 'desativado'));
};

const alternarConfiguracoes = () => {
  document.getElementById('config').classList.toggle('visible');
};

document.getElementById('oferta').addEventListener('input', atualizarResultados);
document.getElementById('correcao').addEventListener('input', atualizarResultados);

window.onload = () => {
  carregarDados();
};

document.getElementById('btnExportarPDF').addEventListener('click', () => {
  const opt = {
    margin: 0.5,
    filename: 'dizimo-oferta.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'cm', format: 'a5', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  const elemento = document.querySelector('.container');

  html2pdf().set(opt).from(elemento).save();
});