// Texto da Política de Privacidade e dos Termos de Uso, copiado dos arquivos
// .docx enviados pelo Leo em 2026-11-02 (Downloads\documentos). Para mudar o
// texto, edite aqui — a página LegalPage só cuida da apresentação.

export type LegalBlock =
  | { type: 'p'; text: string; lead?: string }
  | { type: 'ul'; items: { text: string; lead?: string }[] }
  | { type: 'table'; head: string[]; rows: string[][] };

export interface LegalSection {
  title: string;
  blocks: LegalBlock[];
}

export interface LegalDoc {
  title: string;
  updated: string;
  sections: LegalSection[];
}

export const PRIVACY_POLICY: LegalDoc = {
  title: 'Política de Privacidade do Zushy',
  updated: 'Última atualização: 2 de novembro de 2026. Versão 1.0',
  sections: [
    {
      title: '1. Quem é o responsável pelos dados',
      blocks: [
        { type: 'p', text: 'Esta Política explica como o Zushy trata dados pessoais, de acordo com a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).' },
        { type: 'p', text: 'O responsável pelo tratamento dos dados do dono do restaurante é José Gabriel Vágula Gomes Voltarelli, CPF 102.519.429-29, com endereço na Rua Ívai, 111, Califórnia/PR. Canal de privacidade e contato para qualquer assunto sobre dados pessoais: zushy.br@gmail.com.' },
      ],
    },
    {
      title: '2. Quais dados coletamos',
      blocks: [
        { type: 'p', text: 'O Zushy trata dados de três grupos de pessoas.' },
        {
          type: 'table',
          head: ['Quem', 'Dados', 'Como chegam ao Zushy'],
          rows: [
            ['Dono do restaurante (nosso cliente)', 'Nome, e-mail, telefone ou WhatsApp, nome do restaurante, senha de acesso e data e hora do aceite dos Termos', 'Informados por você no cadastro e no uso do painel'],
            ['Clientes do restaurante', 'Nome, telefone, endereço de entrega e itens do pedido', 'Informados por eles ao fazer um pedido no cardápio digital'],
            ['Visitantes do site', 'Páginas visitadas, tipo de aparelho e navegador, endereço IP e dados de cookies', 'Coletados automaticamente, com o Google Analytics, depois do seu aceite'],
          ],
        },
        { type: 'p', text: 'Os dados de pagamento (Pix ou cartão) são tratados pela InfinitePay. O Zushy não guarda número de cartão.' },
      ],
    },
    {
      title: '3. Para que usamos os dados',
      blocks: [
        { type: 'p', text: 'Usamos os dados apenas para as finalidades abaixo.' },
        {
          type: 'ul',
          items: [
            { lead: 'Fornecer o serviço:', text: 'criar e manter a conta, exibir o cardápio digital, registrar pedidos e mostrar o controle de vendas (execução do contrato).' },
            { lead: 'Cobrar a mensalidade:', text: 'processar pagamentos e enviar avisos e comprovantes (execução do contrato).' },
            { lead: 'Falar com você:', text: 'responder dúvidas, avisar sobre a cobrança, mudanças nos Termos e problemas no serviço (execução do contrato e legítimo interesse).' },
            { lead: 'Cumprir obrigações legais:', text: 'guardar registros de pagamento e do aceite dos Termos pelo prazo exigido em lei (obrigação legal e exercício regular de direitos).' },
            { lead: 'Melhorar o site:', text: 'entender como ele é usado, com o Google Analytics, somente depois do seu consentimento para cookies.' },
          ],
        },
      ],
    },
    {
      title: '4. Com quem compartilhamos',
      blocks: [
        { type: 'p', text: 'O Zushy não vende dados pessoais. Os dados são compartilhados apenas com empresas que ajudam a operar o serviço:' },
        {
          type: 'table',
          head: ['Empresa', 'Para que serve'],
          rows: [
            ['Supabase', 'Banco de dados, onde ficam armazenadas as informações do serviço'],
            ['GitHub', 'Hospedagem do site'],
            ['InfinitePay', 'Processamento dos pagamentos'],
            ['Google (Google Analytics)', 'Estatísticas de uso do site, após o consentimento para cookies'],
          ],
        },
        { type: 'p', text: 'Algumas dessas empresas podem armazenar dados em servidores fora do Brasil. Nesses casos, o Zushy busca fornecedores que adotem medidas de segurança adequadas, como prevê a LGPD.' },
        { type: 'p', text: 'Os dados também podem ser fornecidos a autoridades quando houver exigência legal ou ordem judicial.' },
      ],
    },
    {
      title: '5. Cookies e Google Analytics',
      blocks: [
        { type: 'p', text: 'O site usa cookies do Google Analytics para medir o uso das páginas, e só os carrega depois que você aceita no aviso de cookies.' },
        {
          type: 'ul',
          items: [
            { lead: 'O que coletam:', text: 'páginas visitadas, tempo de visita, tipo de aparelho e navegador, endereço IP e uma localização aproximada.' },
            { lead: 'Para que servem:', text: 'entender o que funciona no site e melhorá-lo. O Zushy não usa esses dados para identificar você pessoalmente.' },
            { lead: 'Como mudar de ideia:', text: 'você pode recusar ou revogar o consentimento a qualquer momento pelo link de preferências de cookies no rodapé, ou apagando os cookies no seu navegador.' },
            { lead: 'Cookies essenciais:', text: 'os necessários para o login e o funcionamento do painel não dependem de consentimento.' },
          ],
        },
      ],
    },
    {
      title: '6. Por quanto tempo guardamos e como protegemos',
      blocks: [
        { type: 'p', text: 'Guardamos os dados enquanto a conta estiver ativa e pelo tempo necessário para as finalidades desta Política.' },
        {
          type: 'ul',
          items: [
            { lead: 'Depois do cancelamento:', text: 'os dados ficam guardados por até 90 dias, para você poder voltar ou exportar o que precisar, e depois são apagados ou anonimizados.' },
            { lead: 'Pagamentos e aceite dos Termos:', text: 'são guardados pelo prazo exigido em lei, por até 5 anos, ou mais se a lei exigir, para fins fiscais e para a defesa em eventual disputa.' },
            { lead: 'Cópias de segurança:', text: 'podem levar um pouco mais para serem apagadas.' },
          ],
        },
        { type: 'p', text: 'Para proteger os dados, o Zushy usa conexão segura (HTTPS), senhas armazenadas de forma protegida e acesso restrito às informações. Nenhum sistema é totalmente imune a falhas. Se houver um incidente que possa causar risco relevante a você, o Zushy avisará as pessoas afetadas e a Autoridade Nacional de Proteção de Dados (ANPD), como a lei determina.' },
      ],
    },
    {
      title: '7. Seus direitos e como exercê-los',
      blocks: [
        { type: 'p', text: 'Pela LGPD, você pode pedir ao Zushy, a qualquer momento:' },
        {
          type: 'ul',
          items: [
            { text: 'informação sobre a possibilidade de não consentir e as consequências da recusa;' },
            { text: 'oposição a tratamentos feitos sem consentimento, quando houver descumprimento da lei;' },
            { text: 'confirmação de que tratamos seus dados e acesso a eles;' },
            { text: 'correção de dados incompletos, errados ou desatualizados;' },
            { text: 'anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desacordo com a lei;' },
            { text: 'portabilidade dos dados;' },
            { text: 'informação sobre com quem compartilhamos seus dados;' },
            { text: 'revogação do consentimento, como o dado aos cookies;' },
            { text: 'eliminação dos dados tratados com base no seu consentimento.' },
          ],
        },
        { type: 'p', text: 'Para fazer qualquer pedido, escreva para zushy.br@gmail.com. A confirmação de que tratamos seus dados é imediata, e a resposta completa ao seu pedido sai em até 15 dias. Se achar que seus direitos não foram respeitados, você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).' },
      ],
    },
    {
      title: '8. Dados dos clientes dos restaurantes, alterações e contato',
      blocks: [
        { type: 'p', lead: 'Se você fez um pedido em um restaurante que usa o Zushy:', text: 'o restaurante é o controlador dos seus dados (nome, telefone, endereço e pedido), e o Zushy apenas os trata em nome dele para operar o cardápio digital. Para pedir acesso, correção ou exclusão desses dados, procure primeiro o restaurante. O Zushy ajuda o restaurante a atender o seu pedido, e você também pode escrever para zushy.br@gmail.com.' },
        { type: 'p', lead: 'Alterações:', text: 'esta Política pode ser atualizada. A data da última atualização aparece no topo, e mudanças relevantes serão avisadas por e-mail ou WhatsApp.' },
        { type: 'p', lead: 'Contato:', text: 'zushy.br@gmail.com.' },
      ],
    },
  ],
};

export const TERMS_OF_USE: LegalDoc = {
  title: 'Termos de Uso do Zushy',
  updated: 'Última atualização: 2 de novembro de 2026. Versão 1.0',
  sections: [
    {
      title: '1. Quem somos e aceite dos Termos',
      blocks: [
        { type: 'p', text: 'O Zushy é um serviço online de cardápio digital e controle de vendas para restaurantes de sushi, oferecido por José Gabriel Vágula Gomes Voltarelli, CPF 102.519.429-29, com endereço na Rua Ívai, 111, Califórnia/PR, e e-mail de contato zushy.br@gmail.com ("Zushy").' },
        { type: 'p', text: 'Ao criar uma conta ou usar o Zushy, você declara que leu e aceitou estes Termos de Uso e a Política de Privacidade. Se não concordar, não use o serviço.' },
        { type: 'p', text: 'O serviço é destinado a maiores de 18 anos e a pessoas jurídicas ou empreendedores que contratem em nome de um restaurante, com poderes para isso.' },
        { type: 'p', text: 'Os clientes do restaurante podem fazer pedidos pelo cardápio digital, e o restaurante é responsável pelos pedidos feitos por menores de idade.' },
      ],
    },
    {
      title: '2. O que é o serviço',
      blocks: [
        { type: 'p', text: 'O Zushy oferece ao restaurante um cardápio digital, por onde os clientes do restaurante podem consultar os produtos e fazer pedidos, e um painel de controle de vendas, acessado em zushy.com.br.' },
        {
          type: 'ul',
          items: [
            { text: 'O Zushy é uma ferramenta de apoio. A venda dos alimentos e a entrega são de responsabilidade exclusiva do restaurante.' },
            { text: 'Recursos e telas podem mudar com o tempo, para melhorar o serviço.' },
            { text: 'Os recursos disponíveis em cada plano são os descritos na página de Preços do site.' },
          ],
        },
      ],
    },
    {
      title: '3. Cadastro e conta',
      blocks: [
        { type: 'p', text: 'Para usar o Zushy, é preciso criar uma conta com informações verdadeiras e atualizadas.' },
        {
          type: 'ul',
          items: [
            { text: 'Você é responsável pela senha e por tudo o que for feito na sua conta. Não compartilhe a senha com terceiros.' },
            { text: 'Se suspeitar de acesso indevido, avise o Zushy imediatamente pelo e-mail zushy.br@gmail.com.' },
            { text: 'Cada conta corresponde a um restaurante. Para usar o Zushy em mais de um estabelecimento, é preciso contratar separadamente.' },
            { text: 'No cadastro, será pedido o aceite destes Termos, e o Zushy guarda a data, a hora e a versão aceita, e envia uma cópia dos Termos por e-mail.' },
          ],
        },
      ],
    },
    {
      title: '4. Teste grátis, preço e pagamento',
      blocks: [
        { type: 'p', text: 'O Zushy oferece 7 dias de teste grátis, sem cobrança. Depois do teste, a assinatura custa R$ 127,00 por mês.' },
        {
          type: 'ul',
          items: [
            { lead: 'Cobrança:', text: 'a mensalidade é cobrada todos os meses, de forma recorrente, até o cancelamento.' },
            { lead: 'Primeira cobrança:', text: 'ocorre ao fim do teste grátis. O Zushy avisa o cliente antes dessa cobrança.' },
            { lead: 'Meios de pagamento:', text: 'Pix ou cartão, pela InfinitePay, que processa os pagamentos. O Zushy não guarda os dados do seu cartão.' },
            { lead: 'Reajuste:', text: 'o valor pode mudar, com aviso prévio por e-mail ou WhatsApp, e vale apenas para as cobranças seguintes.' },
            { lead: 'Falta de pagamento:', text: 'se a cobrança falhar, o Zushy pode suspender o acesso até a regularização.' },
            { lead: 'Nota fiscal:', text: 'por enquanto, o Zushy não emite nota fiscal. Após cada pagamento, o cliente recebe um comprovante por e-mail.' },
          ],
        },
      ],
    },
    {
      title: '5. Cancelamento e reembolso',
      blocks: [
        { type: 'p', text: 'O cliente pode cancelar a assinatura a qualquer momento pelo painel, sem multa e sem fidelidade.' },
        {
          type: 'ul',
          items: [
            { lead: 'Acesso após o cancelamento:', text: 'se cancelar no meio do mês, o cliente continua com acesso até o fim do mês já pago. O acesso é encerrado ao fim desse período e não há nova cobrança.' },
            { lead: 'Dados:', text: 'ficam guardados por até 90 dias após o encerramento, para o cliente poder voltar ou exportar o que precisar. Depois disso, são apagados ou anonimizados, salvo o que a lei exigir guardar. O cliente pode pedir a exclusão antes, pelo e-mail zushy.br@gmail.com.' },
            { lead: 'Reembolso:', text: 'não há reembolso do mês já pago, pois antes da cobrança o Zushy oferece 7 dias de teste grátis, com cancelamento a qualquer momento.' },
            { lead: 'Exceção:', text: 'em caso de erro do Zushy, como cobrança em duplicidade ou cobrança após o cancelamento, o valor é devolvido integralmente.' },
          ],
        },
        { type: 'p', text: 'Nada nestes Termos afasta direitos que a lei garante ao consumidor.' },
      ],
    },
    {
      title: '6. Regras de uso e dados dos clientes do restaurante',
      blocks: [
        { type: 'p', text: 'O restaurante se compromete a usar o Zushy de forma lícita e a respeitar as regras abaixo.' },
        {
          type: 'ul',
          items: [
            { text: 'Não usar o serviço para fins ilegais nem para enganar clientes.' },
            { text: 'Não tentar invadir, sobrecarregar ou acessar áreas do sistema sem autorização.' },
            { text: 'Não copiar, revender ou redistribuir o Zushy sem autorização por escrito.' },
            { text: 'Ser o único responsável pelo conteúdo do seu cardápio, como nomes, descrições, preços, fotos e disponibilidade, e ter direito de usar o que publicar.' },
          ],
        },
        { type: 'p', lead: 'Dados dos clientes do restaurante.', text: 'Quando o restaurante recebe pedidos pelo Zushy, os dados das pessoas que pedem (como nome, telefone e endereço de entrega) são de responsabilidade do restaurante, que é o controlador desses dados perante essas pessoas. O restaurante deve informar seus clientes sobre o uso desses dados, e o Zushy trata essas informações apenas para operar o serviço em nome do restaurante. O tratamento de dados pessoais está descrito na Política de Privacidade.' },
      ],
    },
    {
      title: '7. Disponibilidade e limites de responsabilidade',
      blocks: [
        { type: 'p', text: 'O Zushy se esforça para manter o serviço funcionando, mas não garante que ele ficará disponível o tempo todo e sem erros.' },
        {
          type: 'ul',
          items: [
            { text: 'O serviço depende de empresas parceiras, como hospedagem, banco de dados e pagamento, e de uma conexão de internet. Instabilidades podem ocorrer.' },
            { text: 'Manutenções e atualizações podem causar paradas curtas, avisadas sempre que possível.' },
            { text: 'O Zushy pode suspender contas que descumpram estes Termos, com aviso quando possível.' },
            { text: 'Na medida permitida pela lei, o Zushy não responde por prejuízos indiretos, como lucros que o restaurante deixou de ter por causa de uma falha, nem por problemas causados por informações incorretas no cardápio ou por falhas na internet ou nos aparelhos do restaurante.' },
          ],
        },
      ],
    },
    {
      title: '8. Alterações, contato e foro',
      blocks: [
        { type: 'p', text: 'O Zushy pode atualizar estes Termos. Quando a mudança for relevante, o cliente será avisado por e-mail ou WhatsApp antes de ela valer, e o uso do serviço depois disso significa que ele aceitou o novo texto. Quem não concordar pode cancelar a assinatura.' },
        { type: 'p', text: 'Para dúvidas, pedidos de cancelamento, reembolso por erro ou questões sobre dados pessoais, escreva para zushy.br@gmail.com.' },
        { type: 'p', text: 'Estes Termos seguem as leis do Brasil. Para resolver qualquer disputa, fica eleito o foro da comarca a que pertence a cidade de Califórnia/PR, sem prejuízo do direito do consumidor de acionar o foro do seu domicílio, quando a lei assim garantir.' },
      ],
    },
  ],
};
