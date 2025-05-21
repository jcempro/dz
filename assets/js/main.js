(function ($) {
  let salvarAuto = false;

  const itens_html = `
      <i class="fa-solid fa-coins"></i>
      <span class="label-edit" contenteditable="true">#{nome}</span>
      <input type="text" class="valor" data-valor data-raw="#{valor}" value="#{fvalor}" />
      <i class="fa-solid fa-trash-can remove-btn"></i>          
    `;

  Element.prototype.on = addEventListener;
  Element.prototype.$ = Element.prototype.querySelectorAll;

  const formatarMoeda = valor => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatarPorcentagem = valor => Number(valor).toLocaleString('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const atualizarResultados = () => {
    const valores = [...$('[data-valor]')].map(el => parseFloat(el.getAttribute('data-raw')) || 0);

    const soma = valores.reduce((acc, v) => acc + v, 0);
    const ofertaPct = Math.max(0, Math.min(75, parseFloat($('#oferta').value) || 0));
    const correcaoPct = Math.max(0, Math.min(10, parseFloat($('#correcao').value) || 0));
    const dizimo = soma * 0.10;
    const dizimoCorrigido = dizimo * (1 + correcaoPct / 100);
    const oferta = soma * (ofertaPct / 100);
    const total = dizimoCorrigido + oferta;

    $('#soma')[0].textContent = formatarMoeda(soma);
    $('#dizimo')[0].textContent = formatarMoeda(dizimo);
    $('#dizimoCorrigido')[0].textContent = formatarMoeda(dizimoCorrigido);
    $('#ofertaValor')[0].textContent = formatarMoeda(oferta);
    $('#totalFinal')[0].textContent = formatarMoeda(total);

    if ($('#autosave')[0].checked) salvarDados(false);
  };

  const formatarEAtualizar = e => {
    let input = e.target;
    let valor = input.value.replace(/[^\d]/g, '');
    valor = (parseInt(valor || '0') / 100).toFixed(2);
    input.setAttribute('data-raw', valor);
    input.value = (input.hasAttribute('data-percent') ? formatarPorcentagem : formatarMoeda)(valor);
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
      .replaceAll('#{nome}', nome)
      .replaceAll('#{valor}', typeof valor !== "undefined" ? valor : '')
      .replaceAll('#{fvalor}', typeof valor !== "undefined" ? formatarMoeda(valor) : '');

    div.$('[data-valor]')[0].on('input', formatarEAtualizar);
    div.$('.label-edit')[0].on('focus', e => e.target.classList.add('editing'));
    div.$('.label-edit')[0].on('blur', e => e.target.classList.remove('editing'));
    $('#recebimentos')[0].appendChild(div);
    div.$('.remove-btn')[0].on('click', removerCampo);
  };

  const removerCampo = (e) => {
    e.target.closest('.receita-item').remove();
    atualizarResultados();
  };

  const salvarDados = (mostrar = true) => {
    const campos = [...$('#recebimentos .receita-item')].map(item => ({
      nome: item.$('.label-edit')[0].textContent.trim(),
      valor: parseFloat(item.$('[data-valor]')[0].getAttribute('data-raw')) || 0
    }));

    const dados = {
      campos,
      oferta: parseFloat($('#oferta')[0].value) || 0,
      correcao: parseFloat($('#correcao')[0].value) || 0,
      autosave: $('#autosave')[0].checked
    };

    localStorage.setItem('dizimoDados', JSON.stringify(dados));
    if (mostrar) console.log('Dados salvos com sucesso.', JSON.parse(localStorage.getItem("dizimoDados")));
  };

  const carregarDados = () => {
    const dados = JSON.parse(localStorage.getItem('dizimoDados'));
    if (!dados || !dados.campos) {
      console.log('Nenhum dado salvo encontrado.');
      return;
    }

    $('#recebimentos')[0].innerHTML = '';
    dados.campos.forEach(({ nome, valor }) => {
      adicionarCampo(nome, valor);
    });

    $('#oferta')[0].value = dados.oferta;
    $('#correcao')[0].value = dados.correcao;
    $('#autosave')[0].checked = !!dados.autosave;

    atualizarResultados();
  };

  $('#oferta')[0].on('input', atualizarResultados);
  $('#correcao')[0].on('input', atualizarResultados);

  window.onload = () => {
    carregarDados();
  };

  $('#btnExportarPDF')[0].on('click', () => {
    // Extrai e sanitiza o nome do arquivo
    const titulo = (document.querySelector('header h1')?.textContent || 'resumo')
      .trim()
      .replace(/[\/\\:*?"<>|]/g, '')     // Remove caracteres inválidos
      .replace(/\s+/g, '_')              // Substitui espaços por _
      .slice(0, 100);                    // Limita o tamanho para segurança

    const opt = {
      margin: 0.5,
      filename: `${titulo || 'relatorio'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'cm', format: 'a5', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    const elemento = $('.container')[0];
    const noprintElems = document.querySelectorAll('.noprint');
    const originalDisplays = new Map();

    noprintElems.forEach(el => {
      originalDisplays.set(el, el.style.display);
      el.style.display = 'none';
    });

    html2pdf().set(opt).from(elemento).save().then(() => {
      noprintElems.forEach(el => {
        el.style.display = originalDisplays.get(el) || '';
      });
    });
  });

  adicionarCampo(["Proventos", "Acertos", "Alimentação", "Refeição", "Aluguel"]);

  $('.header-buttons .add')[0].on('click', adicionarCampo);
  $('.header-buttons .save')[0].on('click', salvarDados);
  $('.header-buttons .clear')[0].on('click', () => {
    $('input').forEach(input => {
      if (input.type === 'checkbox') {
        return;
      }

      const raw = parseFloat(input.getAttribute('data-default') ?? 0).toFixed(2);
      input.setAttribute('data-raw', raw);

      input.value = input.hasAttribute('data-percent')
        ? formatarPorcentagem(raw)
        : formatarMoeda(raw);
    });

    atualizarResultados();
  });

  $('.config label input').forEach(e => {
    e.on('blur', formatarPorcentagem);
  });

  $('#autosave')[0].on('change', () => salvarDados());

  $('[contenteditable="true"]').forEach(el => {
    el.on('input', atualizarResultados);
  });
  
  $('[contenteditable="true"]').forEach(el => {
    el.on('blur', atualizarResultados);
  });

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

    if (r.length === 0) {
      console.warn("Nada encontrado para '" + t + "'");
    }

    return r;
  }
));