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
    // Pega os valores numéricos limpos do atributo data-raw de cada input com data-valor
    const valores = [...$('[data-valor]')].map(el => parseFloat(el.getAttribute('data-raw')) || 0);

    // Soma dos valores limpos
    const soma = valores.reduce((acc, v) => acc + v, 0);

    // Para oferta e correção, pegar do input correspondente (inputs de texto)
    // com parseFloat no data-raw para evitar problemas de vírgula
    const ofertaPct = Math.max(0, Math.min(75, parseFloat($('#oferta')[0].getAttribute('data-raw')) || 0));
    const correcaoPct = Math.max(0, Math.min(10, parseFloat($('#correcao')[0].getAttribute('data-raw')) || 0));

    // Cálculos:
    const dizimo = soma * 0.10;
    // dizimo corrigido = dizimo acrescido da porcentagem de correção
    const dizimoCorrigido = dizimo * (1 + correcaoPct);
    // oferta é percentual de soma
    const oferta = soma * ofertaPct;
    const total = dizimoCorrigido + oferta;

    // Atualiza os campos de resultado, formatando os valores
    $('#soma')[0].textContent = formatarMoeda(soma);
    $('#dizimo')[0].textContent = formatarMoeda(dizimo);
    $('#dizimoCorrigido')[0].textContent = formatarMoeda(dizimoCorrigido);
    $('#ofertaValor')[0].textContent = formatarMoeda(oferta);
    $('#totalFinal')[0].textContent = formatarMoeda(total);

    // Se autosave estiver ativo, salva os dados
    if ($('#autosave')[0].checked) salvarDados(false);
  };

  const formatarEAtualizar = e => {
    let input = e.target;
    let valorStr = input.value.replace(/[^\d]/g, '') || '0';
    let valorDecimal;

    if (input.hasAttribute('data-percent')) {
      // valor em decimal, ex: '2' vira 0.02
      valorDecimal = (parseInt(valorStr) / 100).toFixed(4);
      input.setAttribute('data-raw', valorDecimal);
      input.value = formatarPorcentagem(valorDecimal);
    } else {
      valorDecimal = (parseInt(valorStr) / 100).toFixed(2);
      input.setAttribute('data-raw', valorDecimal);
      input.value = formatarMoeda(valorDecimal);
    }

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

    const ofertaRaw = parseFloat($('#oferta')[0].getAttribute('data-raw')) || 0;
    const correcaoRaw = parseFloat($('#correcao')[0].getAttribute('data-raw')) || 0;

    const dados = {
      campos,
      oferta: ofertaRaw,
      correcao: correcaoRaw,
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

    // oferta e correcao são decimais salvos, ex: 0.02 para 2%
    $('#oferta')[0].setAttribute('data-raw', dados.oferta ?? 0);
    $('#oferta')[0].value = formatarPorcentagem(dados.oferta ?? 0);

    $('#correcao')[0].setAttribute('data-raw', dados.correcao ?? 0);
    $('#correcao')[0].value = formatarPorcentagem(dados.correcao ?? 0);

    $('#autosave')[0].checked = !!dados.autosave;

    atualizarResultados();
  };

  window.onload = () => {
    carregarDados();

    $('#oferta')[0].on('input', formatarPercentInput);
    $('#correcao')[0].on('input', formatarPercentInput);
  };

  $('#btnExportarPDF')[0].on('click', () => {
    // Extrai e sanitiza o nome do arquivo
    const titulo = (document.querySelector('header h1')?.textContent || 'resumo')
      .trim()
      .replace(/[\/\\:*?"<>|]/g, '-')     // Remove caracteres inválidos
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

  $('.header-buttons .factory')[0].on('click', ()=>{
    if (!confirm("Isto apagará completamente todos os valores, incluindo itens existes, para o modelo de fábrica. Quer continuar?")) return;
    console.log("Salvando dados...");
    localStorage.setItem('dizimoDados', JSON.stringify(null));
    window.location.reload();
  });
  $('.header-buttons .add')[0].on('click', adicionarCampo);
  $('.header-buttons .save')[0].on('click', salvarDados);
  $('.header-buttons .clear')[0].on('click', () => {
    if (!confirm("Isto zerará todos os valores já preenchidos. Quer continuar?")) return;
    console.log("Salvando dados...");
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

  const formatarPercentInput = e => {
    let input = e.target;
    let valorStr = input.value.replace(/[^\d]/g, '') || '0';
    let valorDecimal = (parseInt(valorStr) / 100).toFixed(4);
    input.setAttribute('data-raw', valorDecimal);
    input.value = formatarPorcentagem(valorDecimal);
    atualizarResultados();
  };

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