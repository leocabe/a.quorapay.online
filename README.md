# Alivio en Cada Plato

Recriação da página do print fornecido, usando o conteúdo, as imagens, as fontes e os estilos da página original.

Abra `index.html` no navegador. Não é necessário instalar dependências ou compilar. Para servir localmente, execute `python3 -m http.server 8000` nesta pasta e acesse `http://localhost:8000`.

- `index.html`: todas as 13 seções da página e seus estilos originais.
- `assets/`: imagens, fontes, CSS e comportamento da página, armazenados localmente.
- `assets/page.js`: perguntas frequentes, contador. Os links de compra estão diretamente no HTML.
- `assets/currency.js`: conversão automática de moedas.
- `backup/index.previous.html`: versão anterior do projeto.

Os botões de compra (principal, bônus e final) abrem diretamente o checkout Hotmart `C96666094Q`, oferta `8s7i881n`, na mesma aba, sem depender de JavaScript ou de popup. O checkout real foi aberto em teste e exibiu o produto “Alivio En Cada Plato” por US$ 15. A página não altera o preço cadastrado na Hotmart: essa oferta precisa estar configurada para US$ 15 na conta do vendedor.

## Preços e moedas

O preço-base é US$ 15, com preço anterior de US$ 30 para manter a promoção de 50%. Os nove valores de bônus foram convertidos de ARS para USD pela cotação de 23/09/2026 (1 USD = 1513,6838 ARS), arredondados para centavos e fixados nos atributos `data-usd`. O total corrigido é US$ 54,24; o total antigo não correspondia à soma dos bônus.

A página detecta automaticamente a moeda por IP usando dois provedores independentes, [Country](https://country.is/) e [ipapi](https://ipapi.co/api/), aceitando a primeira resposta válida. O mapeamento país/moeda vem do Unicode CLDR (licença em `assets/unicode-license.txt`). A página e busca taxas diárias em [Currency API](https://github.com/fawazahmed0/exchange-api) (CC0), com dois endpoints independentes. Os valores são revelados juntos somente após a detecção, sem uma exibição inicial em dólar. A localização fica em cache por uma hora na sessão; cada nova sessão volta a detectar o país. Não há seletor manual nem bloco de explicação de câmbio na página. As cotações ficam em cache por até 24 horas; dados com mais de 48 horas são rejeitados. Sem cotação ou para moedas não suportadas, os valores permanecem em USD. A conversão local é estimativa; o valor final, impostos e moedas aceitas dependem da Hotmart. Essas funções e o checkout requerem conexão à internet.

Para alterar valores, edite `data-usd` e o texto inicial correspondente em `index.html`. O total dos bônus é recalculado a partir dos valores exibidos, inclusive para moedas sem centavos.

## Verificação

Com o servidor local ativo, abra `/tests/currency.html`. Os testes usam respostas simuladas e conferem BRL, AOA, JPY, EUR, ausência de seletor manual, falha dos serviços, cada provedor de localização isoladamente, moeda não suportada, ocultação dos preços durante a detecção e destinos dos três botões de compra. Não iniciam pagamentos.


O contador é mantido durante a sessão e para em zero. O número de visitantes é uma reprodução visual, sem conexão a dados ao vivo.


## Oferta de retorno

`oferta.html` contém uma oferta de US$ 9 (convertida automaticamente), no estilo visual da página principal. O link fica em `assets/offer-config.js`. **A pedido do proprietário, usa provisoriamente o checkout de US$ 15. Substituir pela oferta de US$ 9 antes de publicar.**

`assets/backredirect.js` prepara uma única entrada no histórico depois da primeira interação. Ao voltar para essa entrada, abre `oferta.html` uma vez por sessão. As saídas seguintes não são interceptadas. Sem armazenamento de sessão, o redirecionamento não é ativado. Sem JavaScript, os preços-base aparecem em dólares.

Não foi criado um depoimento ou antes/depois fictício como se fosse real. A imagem enviada menciona seis semanas, e não sustenta uma alegação de quatro quilos em sete dias. A página agora usa a peça fornecida pelo proprietário como imagem central, com identificação visível de ilustração publicitária e de depoimento/resultados não verificados. Prova social autêntica depende de fotos e relato reais da cliente.
