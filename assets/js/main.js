(function ($) {
  let salvarAuto = false;

  const itens_html = `
      <i class="fa fa-circle"></i>
      <span class="label-edit" contenteditable="true">\${nome}</span>
      <input type="text" class="valor" data-valor data-raw="\${valor}" value="\${fvalor}" />
      <i class="fa-solid fa-trash-can remove-btn"></i>          
    `;

  Element.prototype.on = addEventListener;
  Element.prototype.$ = Element.prototype.querySelectorAll;

  const formatarMoeda = valor => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const atualizarResultados = () => {
    const valores = [...$('[data-valor]')].map(el => parseFloat(el.getAttribute('data-raw')) || 0);
    const soma = valores.reduce((acc, v) => acc + v, 0);
    const ofertaPct = Math.max(0, Math.min(75, parseFloat($('#oferta').value) || 0));
    const correcaoPct = Math.max(0, Math.min(10, parseFloat($('#correcao').value) || 0));
    const dizimo = soma * 0.10;
    const dizimoCorrigido = dizimo * (1 + correcaoPct / 100);
    const oferta = soma * (ofertaPct / 100);
    const total = dizimoCorrigido + oferta;

    $('#soma').textContent = formatarMoeda(soma);
    $('#dizimo').textContent = formatarMoeda(dizimo);
    $('#dizimoCorrigido').textContent = formatarMoeda(dizimoCorrigido);
    $('#ofertaValor').textContent = formatarMoeda(oferta);
    $('#totalFinal').textContent = formatarMoeda(total);

    if ($('#autosave').checked) salvarDados(false);
  };

  const formatarEAtualizar = e => {
    let input = e.target;
    let valor = input.value.replace(/[^\d]/g, '');
    valor = (parseInt(valor || '0') / 100).toFixed(2);
    input.setAttribute('data-raw', valor);
    input.value = formatarMoeda(valor);
    atualizarResultados();
  };

  const adicionarCampo = (nome_, valor) => {
    if (typeof nome_ === "object" && Array.isArray(nome_)) {
      nome_.forEach(i => {
        adicionarCampo(i);
      });
      return;
    }

    const nome = (typeof nome_ !== "string") ? prompt("Informe o nome do novo campo de recebimento:", 'Nova Receita') : nome_;

    if ((typeof nome !== 'string') || (nome === null)) return;

    const div = document.createElement('div');
    div.className = 'receita-item';
    div.innerHTML = itens_html
      .replaceAll('\${nome}', nome)
      .replaceAll('\${valor}', typeof valor !== "undefined" ? valor : '')
      .replaceAll('\${fvalor}', typeof valor !== "undefined" ? formatarMoeda(valor) : '');

    div.$('[data-valor]')[0].on('input', formatarEAtualizar);
    div.$('.label-edit')[0].on('focus', e => e.target.classList.add('editing'));
    div.$('.label-edit')[0].on('blur', e => e.target.classList.remove('editing'));
    $('#recebimentos').appendChild(div);
    div.$('.remove-btn')[0].on('click', removerCampo);
  };

  const removerCampo = (e) => {
    e.target.closest('.receita-item').remove();
    atualizarResultados();
  };

  const salvarDados = (mostrar = true) => {
    const campos = [...$('#recebimentos .receita-item')].map(item => ({
      nome: item.$('.label-edit').textContent.trim(),
      valor: parseFloat(item.$('[data-valor]').getAttribute('data-raw')) || 0
    }));

    const dados = {
      campos,
      oferta: parseFloat($('#oferta').value) || 0,
      correcao: parseFloat($('#correcao').value) || 0
    };

    localStorage.setItem('dizimoDados', JSON.stringify(dados));
    if (mostrar) alert('Dados salvos com sucesso.');
  };

  const carregarDados = () => {
    const dados = JSON.parse(localStorage.getItem('dizimoDados'));
    if (!dados || !dados.campos) {
      console.log('Nenhum dado salvo encontrado.');
      return;
    }

    $('#recebimentos').innerHTML = '';
    dados.campos.forEach(({ nome, valor }) => {
      adicionarCampo(nome, valor);
    });

    $('#oferta').value = dados.oferta;
    $('#correcao').value = dados.correcao;
    atualizarResultados();
  };

  $('#oferta').on('input', atualizarResultados);
  $('#correcao').on('input', atualizarResultados);

  window.onload = () => {
    carregarDados();
  };

  $('#btnExportarPDF').on('click', () => {
    const opt = {
      margin: 0.5,
      filename: 'dizimo-oferta.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'cm', format: 'a5', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    const elemento = $('.container')[0];

    html2pdf().set(opt).from(elemento).save();
  });

  adicionarCampo(["Proventos", "Acertos", "Alimentação", "Refeição", "Aluguel"]);
  $('.header-buttons .add').on('click', adicionarCampo);
  $('.header-buttons .save').on('click', salvarDados);
}(
  function (t, from) {
    const r = (
      (typeof t === "object" && (t instanceof Element))
        ? t
        : (
          ((typeof from === "object" && (from instanceof Element))
            ? t
            : document
          ).querySelectorAll(t)
        )
    );

    if (r.length === 1 && !(r instanceof Element)) return r[0];

    if (r.length === 0) {
      console.warn("Nada encontrado para '" + t + "'");
    }

    return r;
  }
));