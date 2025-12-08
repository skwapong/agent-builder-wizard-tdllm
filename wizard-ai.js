// AI-Powered Agent Builder Wizard
// Integrates with TD Agent Foundry for intelligent agent generation

// State management
let currentStep = 0;
let knowledgeBases = [];
let kbCounter = 0;
let additionalTools = [];
let toolCounter = 0;
let outputs = [];
let outputCounter = 0;
let promptVariables = [];
let variableCounter = 0;
let agentConfig = {
    description: '',
    tone: 'professional',
    language: 'english',
    audience: '',
    domain: '',
    name: '',
    projectName: '',
    projectDescription: '',
    model: 'anthropic.claude-4.5-sonnet',
    temperature: 0.5,
    maxToolsIterations: 0,
    systemPrompt: ''
};

// Statistics tracking
let wizardStats = {
    startTime: null,
    endTime: null,
    aiGenerationStartTime: null,
    aiGenerationEndTime: null,
    totalTokensUsed: 0,
    inputTokens: 0,
    outputTokens: 0,
    aiApiCalls: 0,
    estimatedCost: 0
};

// AI Chat state
let chatHistory = [];
// Demo mode removed - always using live TD LLM API

// Generation cancellation state
let generationCancelled = false;

// Chat response abort controller
let chatAbortController = null;

// System prompt character limit
const SYSTEM_PROMPT_MAX_LENGTH = 9000;

// Truncate system prompt to stay within character limit
function truncateSystemPrompt(prompt) {
    if (!prompt || prompt.length <= SYSTEM_PROMPT_MAX_LENGTH) {
        return prompt;
    }

    console.warn(`⚠️ System prompt exceeds ${SYSTEM_PROMPT_MAX_LENGTH} chars (${prompt.length}), truncating...`);

    // Try to truncate at a natural break point (paragraph, sentence, or word)
    let truncated = prompt.substring(0, SYSTEM_PROMPT_MAX_LENGTH);

    // Look for last paragraph break
    const lastParagraph = truncated.lastIndexOf('\n\n');
    if (lastParagraph > SYSTEM_PROMPT_MAX_LENGTH * 0.7) {
        truncated = truncated.substring(0, lastParagraph);
    } else {
        // Look for last sentence break
        const lastSentence = truncated.lastIndexOf('. ');
        if (lastSentence > SYSTEM_PROMPT_MAX_LENGTH * 0.8) {
            truncated = truncated.substring(0, lastSentence + 1);
        } else {
            // Look for last word break
            const lastSpace = truncated.lastIndexOf(' ');
            if (lastSpace > SYSTEM_PROMPT_MAX_LENGTH * 0.9) {
                truncated = truncated.substring(0, lastSpace);
            }
        }
    }

    console.log(`✅ Truncated system prompt to ${truncated.length} chars`);
    return truncated;
}

// File attachment state
let currentAttachment = null;

// Generation timer state
let generationTimer = null;
let generationStartTime = null;
const ESTIMATED_GENERATION_TIME = 120; // seconds (conservative estimate to under-promise and over-deliver)

// Initialize wizard
document.addEventListener('DOMContentLoaded', function() {
    // Start tracking wizard session time
    wizardStats.startTime = Date.now();
    console.log('📊 Wizard session started at:', new Date(wizardStats.startTime).toLocaleTimeString());

    setupEventListeners();
    checkApiKeyStatus();
    loadPreferredLanguage();
    showTypingIndicator('Initializing AI assistant...');
    setTimeout(() => {
        removeTypingIndicator();
    }, 1000);
});

// Load preferred language from localStorage
function loadPreferredLanguage() {
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage) {
        agentConfig.language = savedLanguage;
        const globalLanguage = document.getElementById('globalLanguage');
        if (globalLanguage) {
            globalLanguage.value = savedLanguage;
            updatePageLanguage(savedLanguage);
        }
    }
}

// Translation dictionaries
const translations = {
    english: {
        // Header
        'page.title': 'AI-Powered Agent Builder',
        'page.subtitle': "Describe your agent, and I'll help you build it step-by-step",
        'page.powered': 'Powered by TD Agent Foundry • PM Agent Squad Master Template',
        'api.settings': 'API Settings',

        // Assistant Panel
        'assistant.title': 'Agent Foundry Assistant',
        'assistant.subtitle': 'Your agent building assistant',
        'assistant.welcome': "👋 Hi! I'm your Agent Foundry Assistant. I'll help you build a custom AI Foundry Agent.",
        'assistant.start': "<strong>Let's start:</strong> What kind of agent do you want to build? Describe what it should do.",
        'assistant.connected': '🟢 Connected to TD LLM API!',
        'assistant.connection.detail': 'Using local connection on port 3001. All responses come from TD AI via your TD Agent Foundry installation.',
        'button.ask': 'Ask Assistant',
        'button.stop': '⏹️ Stop Response',
        'button.generate': '✨ Auto-Generate Agent',
        'button.cancel': '✖️ Cancel Generation',
        'button.reset': '🔄 Start Over',
        'examples.title': 'Quick Examples:',
        'example.campaign': '🎯 Campaign Building',
        'example.optimization': '📊 Campaign Optimization',
        'example.reporting': '📈 Campaign Reporting',

        // Steps
        'step.describe': 'Describe',
        'step.knowledge': 'Knowledge',
        'step.project': 'Project',
        'step.agent': 'Agent',
        'step.deploy': 'Deploy',

        // Step 0
        'step0.title': '🎯 Step 0: Describe Your Agent',
        'step0.info': '<strong>AI-Powered Building:</strong> Tell TD Agent Foundry what your agent needs to do, and it will automatically generate knowledge bases, configuration, and deployment files for you.',
        'step0.purpose': "What is your agent's purpose?",
        'step0.tone': 'What tone should your agent have?',
        'step0.audience': 'Who will use this agent?',
        'step0.hint': 'Be specific! Include what the agent should do, who will use it, and what knowledge it needs.',
        'step0.tip': '<strong>💡 Tip:</strong> The more detail you provide, the better AI can generate your agent configuration. Include specific examples of questions users might ask or tasks they need help with.',

        // Tone options
        'tone.professional': 'Professional & Formal',
        'tone.friendly': 'Friendly & Conversational',
        'tone.empathetic': 'Empathetic & Supportive',
        'tone.technical': 'Technical & Precise',
        'tone.enthusiastic': 'Enthusiastic & Energetic',

        // Step 1
        'step1.title': '📚 Step 1: Review Knowledge Bases',
        'step1.info': '<strong>✨ AI-Generated:</strong> Based on your description, TD Agent Foundry has created these knowledge bases for your agent. Review and edit as needed.',
        'step1.empty': 'Complete Step 0 to generate knowledge bases',
        'step1.kb.title': 'Knowledge Base',
        'step1.kb.content': 'Content',
        'step1.kb.characters': 'characters',
        'button.addkb': '➕ Add Another Knowledge Base',
        'button.remove': 'Remove',
        'button.expand': 'Expand',

        // Step 2
        'step2.title': '⚙️ Step 2: Review Project Setup',
        'step2.info': '<strong>✨ AI-Generated:</strong> TD Agent Foundry has configured your project settings. Review and modify if needed.',
        'step2.next': '<strong>📍 Next Step:</strong> After completing this wizard, open <a href="https://console.treasuredata.com/app/agents" target="_blank" class="text-indigo-600 hover:text-indigo-800 underline font-semibold">Treasure Data → AI Agent Foundry</a> to deploy your agent.',
        'step2.name': 'Project Name',
        'step2.description': 'Project Description',

        // Step 3
        'step3.title': '🤖 Step 3: Review Agent Configuration',
        'step3.info': '<strong>✨ AI-Generated:</strong> TD Agent Foundry has selected optimal settings for your agent. Customize if needed.',
        'step3.name': 'Agent Display Name',
        'step3.model': 'AI Model',
        'step3.temperature': 'Temperature:',
        'step3.temp.tip': 'Lower = More precise and consistent | Higher = More creative and varied',
        'step3.prompt': 'System Prompt',
        'step3.prompt.tip': 'AI-generated system prompt based on your description',
        'button.regenerate': '🔄 Regenerate',

        // Step 4
        'step4.title': '🚀 Step 4: Download & Deploy',
        'step4.info': '<strong>✅ Configuration Complete!</strong> Your AI agent is ready to deploy. Download all files and follow the deployment guide.',
        'step4.summary': 'Configuration Summary',
        'step4.agent.name': 'Agent Name:',
        'step4.project': 'Project:',
        'step4.model': 'AI Model:',
        'step4.temperature': 'Temperature:',
        'step4.kb': 'Knowledge Bases:',
        'step4.tools': 'Tools:',
        'button.viewoutput': '📄 View Copyable Output Webpage',
        'button.downloadkbs': '📚 Download Knowledge Base Files (.md)',
        'button.downloadproject': '📋 Download Project Setup Guide',
        'button.downloadagent': '🤖 Download Agent Configuration',
        'button.downloadall': '⬇️ Download All Files',
        'button.autodeploy': '🚀 Auto-Deploy to Agent Foundry',
        'deploy.steps': '📖 Next Steps:',
        'deploy.step1': 'Download all files to your computer',
        'deploy.step2': 'Open Agent Foundry',
        'deploy.step3': 'Create new project (use PROJECT_SETUP.md guide)',
        'deploy.step4': 'Upload knowledge base files',
        'deploy.step5': 'Configure agent (use AGENT_CONFIG.md guide)',
        'deploy.step6': 'Test and deploy your agent!',
        'deploy.comingsoon': 'Coming Soon',

        // Navigation
        'button.previous': '← Previous',
        'button.next': 'Next →',
        'step.of': 'Step',
        'step.total': 'of 8',

        // Validation
        'error.required': '⚠️ Please enter a message before sending',
        'validation.description.required': 'Please describe your agent first! Add at least a brief description of what your agent should do (minimum 20 characters).',
        'validation.description.detailed': 'Please provide a detailed description of your agent (at least 50 characters).',
        'validation.kb.required': 'Please create at least one knowledge base.',
        'validation.kb.minimum': 'You must have at least one knowledge base!',
        'validation.kb.title.content': 'must have both a title and content.',
        'validation.kb.limit': 'exceeds the 18,000 character limit.',
        'validation.project.name': 'Please enter a project name.',
        'validation.project.description': 'Please enter a project description.',
        'validation.agent.name': 'Please enter an agent name.',
        'validation.agent.prompt': 'Please provide a system prompt.',
        'validation.ai.failed': 'AI generation failed. Using keyword-based generation instead.',
        'validation.copy.failed': 'Failed to copy: ',

        // Placeholders and examples
        'chat.placeholder': 'Example: I want to build a campaign planning agent that helps marketers create comprehensive marketing campaigns across multiple channels...',
        'example.text': 'Example: I want to build a campaign planning agent that helps marketers create comprehensive marketing campaigns across multiple channels...',
        'audience.placeholder': 'Example: Company employees, customers, internal team members...',
        'connected.status': '🟢 Connected to TD LLM API! Using local connection on port 3001. All responses come from TD AI via your TD Agent Foundry installation.',
        'quick.examples': 'Quick Examples:',
        'tip.text': '💡 Tip: The more detail you provide, the better AI can generate your agent configuration. Include specific examples of questions users might ask or tasks they need help with.',

        // Success messages
        'success.generated': 'Agent generated successfully!',
        'success.created': "I've created:",
        'success.kb.count': 'knowledge bases',
        'success.project.config': 'Project configuration',
        'success.agent.settings': 'Agent settings and system prompt',
        'success.next.step': 'Click <strong>"Next →"</strong> to review and customize each component!',

        // Sidebar messages
        'sidebar.step1.msg': '📚 Great! Review your knowledge bases. These will be the foundation of your agent\'s expertise.',
        'sidebar.step2.msg': '🔧 Now let\'s configure your project. I\'ve pre-filled the details based on your description.',
        'sidebar.step3.msg': '🤖 Almost there! Review your agent settings. I\'ve optimized the model and temperature for your use case.',
        'sidebar.step4.msg': '🎉 Excellent! Your agent is ready to deploy. Download the files and follow the Agent Foundry deployment guide.',
        'sidebar.generating': '✨ Asking TD AI to generate your agent configuration...',
        'sidebar.connected': '🟢 Connected to TD LLM API! Using local connection on port 3001. All responses come from TD AI via your TD Agent Foundry installation.',

        // Domain-specific sample data
        'domain.marketing.name': 'Marketing Campaign Planning Hub',
        'domain.marketing.desc': 'A marketing campaign strategist that assists with campaign planning, content creation, channel selection, and performance optimization. Helps execute effective marketing strategies.',
        'domain.marketing.agent': 'Marketing Campaign Strategist',
        'domain.marketing.prompt': `You are an expert Marketing Campaign Strategist with comprehensive knowledge of campaign planning, social media, content marketing, and analytics.

Your role is to:
- Help plan effective marketing campaigns
- Suggest appropriate channels and tactics
- Provide best practices for each marketing channel
- Assist with content strategy and messaging
- Guide campaign measurement and optimization

Guidelines:
- Start with clear objectives and target audience
- Recommend data-driven strategies
- Provide creative ideas while staying strategic
- Balance short-term tactics with long-term brand building
- Stay current with marketing trends and platforms
- Focus on measurable results and ROI

Always align recommendations with business goals and available resources.`,
        'domain.hr.name': 'Employee HR Support System',
        'domain.hr.desc': 'A comprehensive HR assistant that helps employees with company policies, benefits, time off requests, and general HR inquiries. Provides accurate, empathetic support based on company HR documentation.',
        'domain.hr.agent': 'HR Support Assistant',
        'domain.hr.prompt': `You are an expert HR Assistant with comprehensive knowledge of company policies, employee benefits, time off procedures, and HR best practices.

Your role is to:
- Provide accurate information about company policies and procedures
- Help employees understand their benefits and how to use them
- Guide employees through time off requests and approval processes
- Answer questions about performance reviews and career development
- Maintain a professional, empathetic, and supportive tone

Guidelines:
- Always cite specific policies when providing guidance
- Respect employee privacy and confidentiality
- Escalate sensitive issues to human HR representatives
- Be clear about what you can and cannot help with
- Provide step-by-step instructions when appropriate

When you don't know something, acknowledge it and direct the employee to the appropriate HR resource or team member.`,
        'domain.support.name': 'Customer Support Assistant Platform',
        'domain.support.desc': 'An intelligent customer support system that helps customers with product questions, troubleshooting, and account management. Escalates complex issues to human agents when appropriate.',
        'domain.support.agent': 'Customer Support Agent',
        'domain.support.prompt': `You are an expert Customer Support Assistant with deep knowledge of our products, troubleshooting procedures, and customer service best practices.

Your role is to:
- Answer product questions clearly and accurately
- Guide customers through troubleshooting steps
- Provide helpful documentation and resources
- Escalate complex technical issues to specialists
- Ensure customer satisfaction and positive experiences

Guidelines:
- Be patient, clear, and friendly in all interactions
- Ask clarifying questions to understand the issue fully
- Provide step-by-step troubleshooting instructions
- Know when to escalate to human agents
- Follow up to ensure issues are resolved
- Use simple, non-technical language when possible

If you cannot resolve an issue, clearly explain the escalation process and set appropriate expectations.`,
        'domain.it.name': 'IT Support & Technical Help Desk',
        'domain.it.desc': 'A technical support assistant that guides employees through system setup, software installation, troubleshooting, and security best practices. Provides precise, step-by-step technical guidance.',
        'domain.it.agent': 'IT Support Specialist',
        'domain.it.prompt': `You are an expert IT Support Assistant with comprehensive knowledge of system administration, software installation, security protocols, and technical troubleshooting.

Your role is to:
- Guide users through system setup and configuration
- Provide precise technical instructions
- Help troubleshoot software and hardware issues
- Ensure security best practices are followed
- Support users with varying levels of technical expertise

Guidelines:
- Provide clear, step-by-step technical guidance
- Use screenshots or diagrams when helpful
- Prioritize security in all recommendations
- Verify user understanding before moving to next steps
- Document solutions for knowledge base
- Escalate complex issues to senior IT staff

Always emphasize security best practices and verify that users understand important technical concepts.`,
        'domain.sales.name': 'Sales Assistant & CRM Helper',
        'domain.sales.desc': 'A sales enablement tool that helps sales teams with product information, pricing, objection handling, and closing techniques. Supports the entire sales process from discovery to close.',
        'domain.sales.agent': 'Sales Assistant',
        'domain.sales.prompt': `You are an expert Sales Assistant with deep knowledge of our products, pricing, sales techniques, and customer relationship management.

Your role is to:
- Help sales teams understand product features and benefits
- Provide pricing and discount guidance
- Suggest effective sales techniques for different scenarios
- Help handle customer objections
- Support the entire sales cycle from discovery to close

Guidelines:
- Focus on customer needs and pain points
- Always lead with benefits, support with features
- Provide specific examples and case studies
- Help identify opportunities for upselling/cross-selling
- Maintain professional and persuasive communication
- Follow company pricing and discount policies

Use consultative selling approaches and help build long-term customer relationships.`
    },

    portuguese: {
        'page.title': 'Construtor de Agentes com IA',
        'page.subtitle': 'Descreva seu agente e eu te ajudarei a construí-lo passo a passo',
        'page.powered': 'Desenvolvido por TD Agent Foundry • Modelo PM Agent Squad Master',
        'api.settings': 'Configurações da API',

        'assistant.title': 'Assistente Agent Foundry',
        'assistant.subtitle': 'Seu assistente de construção de agentes',
        'assistant.welcome': "👋 Olá! Sou seu Assistente Agent Foundry. Vou ajudá-lo a construir um Agente AI Foundry personalizado.",
        'assistant.start': "<strong>Vamos começar:</strong> Que tipo de agente você quer construir? Descreva o que ele deve fazer.",
        'assistant.connected': '🟢 Conectado ao TD LLM API!',
        'assistant.connection.detail': 'Usando conexão local na porta 3001. Todas as respostas vêm do TD AI através da sua instalação do TD Agent Foundry.',
        'button.ask': 'Perguntar ao Assistente',
        'button.stop': '⏹️ Parar Resposta',
        'button.generate': '✨ Gerar Agente Automaticamente',
        'button.cancel': '✖️ Cancelar Geração',
        'button.reset': '🔄 Recomeçar',
        'examples.title': 'Exemplos Rápidos:',
        'example.campaign': '🎯 Construção de Campanha',
        'example.optimization': '📊 Otimização de Campanha',
        'example.reporting': '📈 Relatórios de Campanha',

        'step.describe': 'Descrever',
        'step.knowledge': 'Conhecimento',
        'step.project': 'Projeto',
        'step.agent': 'Agente',
        'step.deploy': 'Implantar',

        'step0.title': '🎯 Passo 0: Descreva Seu Agente',
        'step0.info': '<strong>Construção com IA:</strong> Diga ao TD Agent Foundry o que seu agente precisa fazer, e ele irá gerar automaticamente bases de conhecimento, configuração e arquivos de implantação para você.',
        'step0.purpose': 'Qual é o propósito do seu agente?',
        'step0.tone': 'Que tom seu agente deve ter?',
        'step0.audience': 'Quem usará este agente?',
        'step0.hint': 'Seja específico! Inclua o que o agente deve fazer, quem o usará e qual conhecimento ele precisa.',
        'step0.tip': '<strong>💡 Dica:</strong> Quanto mais detalhes você fornecer, melhor a IA pode gerar a configuração do seu agente. Inclua exemplos específicos de perguntas que os usuários podem fazer ou tarefas com as quais precisam de ajuda.',

        'tone.professional': 'Profissional e Formal',
        'tone.friendly': 'Amigável e Conversacional',
        'tone.empathetic': 'Empático e Solidário',
        'tone.technical': 'Técnico e Preciso',
        'tone.enthusiastic': 'Entusiasmado e Energético',

        'step1.title': '📚 Passo 1: Revisar Bases de Conhecimento',
        'step1.info': '<strong>✨ Gerado por IA:</strong> Com base na sua descrição, TD Agent Foundry criou essas bases de conhecimento para seu agente. Revise e edite conforme necessário.',
        'step1.empty': 'Complete o Passo 0 para gerar bases de conhecimento',
        'step1.kb.title': 'Base de Conhecimento',
        'step1.kb.content': 'Conteúdo',
        'step1.kb.characters': 'caracteres',
        'button.addkb': '➕ Adicionar Outra Base de Conhecimento',
        'button.remove': 'Remover',
        'button.expand': 'Expandir',

        'step2.title': '⚙️ Passo 2: Revisar Configuração do Projeto',
        'step2.info': '<strong>✨ Gerado por IA:</strong> O TD Agent Foundry configurou as definições do seu projeto. Revise e modifique se necessário.',
        'step2.next': '<strong>📍 Próximo Passo:</strong> Após completar este assistente, abra <a href="https://console.treasuredata.com/app/agents" target="_blank" class="text-indigo-600 hover:text-indigo-800 underline font-semibold">Treasure Data → AI Agent Foundry</a> para implantar seu agente.',
        'step2.name': 'Nome do Projeto',
        'step2.description': 'Descrição do Projeto',

        'step3.title': '🤖 Passo 3: Revisar Configuração do Agente',
        'step3.info': '<strong>✨ Gerado por IA:</strong> O TD Agent Foundry selecionou configurações ideais para seu agente. Personalize se necessário.',
        'step3.name': 'Nome de Exibição do Agente',
        'step3.model': 'Modelo de IA',
        'step3.temperature': 'Temperatura:',
        'step3.temp.tip': 'Menor = Mais preciso e consistente | Maior = Mais criativo e variado',
        'step3.prompt': 'Prompt do Sistema',
        'step3.prompt.tip': 'Prompt do sistema gerado por IA com base na sua descrição',
        'button.regenerate': '🔄 Regenerar',

        'step4.title': '🚀 Passo 4: Baixar e Implantar',
        'step4.info': '<strong>✅ Configuração Completa!</strong> Seu agente de IA está pronto para implantar. Baixe todos os arquivos e siga o guia de implantação.',
        'step4.summary': 'Resumo da Configuração',
        'step4.agent.name': 'Nome do Agente:',
        'step4.project': 'Projeto:',
        'step4.model': 'Modelo de IA:',
        'step4.temperature': 'Temperatura:',
        'step4.kb': 'Bases de Conhecimento:',
        'step4.tools': 'Ferramentas:',
        'button.viewoutput': '📄 Ver Página de Saída Copiável',
        'button.downloadkbs': '📚 Baixar Arquivos de Base de Conhecimento (.md)',
        'button.downloadproject': '📋 Baixar Guia de Configuração do Projeto',
        'button.downloadagent': '🤖 Baixar Configuração do Agente',
        'button.downloadall': '⬇️ Baixar Todos os Arquivos',
        'button.autodeploy': '🚀 Implantar Automaticamente no Agent Foundry',
        'deploy.steps': '📖 Próximos Passos:',
        'deploy.step1': 'Baixe todos os arquivos para o seu computador',
        'deploy.step2': 'Abra o Agent Foundry',
        'deploy.step3': 'Crie um novo projeto (use o guia PROJECT_SETUP.md)',
        'deploy.step4': 'Carregue os arquivos da base de conhecimento',
        'deploy.step5': 'Configure o agente (use o guia AGENT_CONFIG.md)',
        'deploy.step6': 'Teste e implante seu agente!',
        'deploy.comingsoon': 'Em Breve',

        'button.previous': '← Anterior',
        'button.next': 'Próximo →',
        'step.of': 'Passo',
        'step.total': 'de 8',

        'error.required': '⚠️ Por favor, digite uma mensagem antes de enviar',
        'validation.description.required': 'Por favor, descreva seu agente primeiro! Adicione pelo menos uma breve descrição do que seu agente deve fazer (mínimo de 20 caracteres).',
        'validation.description.detailed': 'Por favor, forneça uma descrição detalhada do seu agente (pelo menos 50 caracteres).',
        'validation.kb.required': 'Por favor, crie pelo menos uma base de conhecimento.',
        'validation.kb.minimum': 'Você deve ter pelo menos uma base de conhecimento!',
        'validation.kb.title.content': 'deve ter título e conteúdo.',
        'validation.kb.limit': 'excede o limite de 18.000 caracteres.',
        'validation.project.name': 'Por favor, insira um nome de projeto.',
        'validation.project.description': 'Por favor, insira uma descrição do projeto.',
        'validation.agent.name': 'Por favor, insira um nome de agente.',
        'validation.agent.prompt': 'Por favor, forneça um prompt do sistema.',
        'validation.ai.failed': 'Geração de IA falhou. Usando geração baseada em palavras-chave.',
        'validation.copy.failed': 'Falha ao copiar: ',

        // Placeholders and examples
        'chat.placeholder': 'Exemplo: Quero construir um agente de planejamento de campanhas que ajuda profissionais de marketing a criar campanhas abrangentes em múltiplos canais...',
        'example.text': 'Exemplo: Quero construir um agente de planejamento de campanhas que ajuda profissionais de marketing...',
        'audience.placeholder': 'Exemplo: Funcionários da empresa, clientes, membros da equipe interna...',
        'connected.status': '🟢 Conectado ao TD LLM API! Usando conexão local na porta 3001. Todas as respostas vêm do TD AI através da sua instalação do TD Agent Foundry.',
        'quick.examples': 'Exemplos Rápidos:',
        'tip.text': '💡 Dica: Quanto mais detalhes você fornecer, melhor a IA pode gerar a configuração do seu agente. Inclua exemplos específicos de perguntas que os usuários podem fazer ou tarefas com as quais precisam de ajuda.',

        // Success messages
        'success.generated': 'Agente gerado com sucesso!',
        'success.created': 'Eu criei:',
        'success.kb.count': 'bases de conhecimento',
        'success.project.config': 'Configuração do projeto',
        'success.agent.settings': 'Configurações e prompt do sistema do agente',
        'success.next.step': 'Clique em <strong>"Próximo →"</strong> para revisar e personalizar cada componente!',

        // Sidebar messages
        'sidebar.step1.msg': '📚 Ótimo! Revise suas bases de conhecimento. Elas serão a base da expertise do seu agente.',
        'sidebar.step2.msg': '🔧 Agora vamos configurar seu projeto. Pré-preenchi os detalhes com base na sua descrição.',
        'sidebar.step3.msg': '🤖 Quase lá! Revise as configurações do agente. Otimizei o modelo e a temperatura para seu caso de uso.',
        'sidebar.step4.msg': '🎉 Excelente! Seu agente está pronto para implantar. Baixe os arquivos e siga o guia de implantação do Agent Foundry.',
        'sidebar.generating': '✨ Pedindo ao TD AI para gerar a configuração do seu agente...',
        'sidebar.connected': '🟢 Conectado ao TD LLM API! Usando conexão local na porta 3001. Todas as respostas vêm do TD AI através da sua instalação do TD Agent Foundry.',

        // Domain-specific sample data
        'domain.marketing.name': 'Hub de Planejamento de Campanhas de Marketing',
        'domain.marketing.desc': 'Um estrategista de campanhas de marketing que auxilia no planejamento de campanhas, criação de conteúdo, seleção de canais e otimização de desempenho. Ajuda a executar estratégias de marketing eficazes.',
        'domain.marketing.agent': 'Estrategista de Campanhas de Marketing',
        'domain.hr.name': 'Sistema de Suporte de RH para Funcionários',
        'domain.hr.desc': 'Um assistente de RH abrangente que ajuda funcionários com políticas da empresa, benefícios, solicitações de folga e consultas gerais de RH. Fornece suporte preciso e empático baseado na documentação de RH da empresa.',
        'domain.hr.agent': 'Assistente de Suporte de RH',
        'domain.support.name': 'Plataforma de Assistente de Suporte ao Cliente',
        'domain.support.desc': 'Um sistema inteligente de suporte ao cliente que ajuda clientes com perguntas sobre produtos, solução de problemas e gerenciamento de contas. Escala questões complexas para agentes humanos quando apropriado.',
        'domain.support.agent': 'Agente de Suporte ao Cliente',
        'domain.it.name': 'Help Desk de Suporte de TI e Técnico',
        'domain.it.desc': 'Um assistente de suporte técnico que orienta funcionários através de configuração de sistema, instalação de software, solução de problemas e melhores práticas de segurança. Fornece orientação técnica precisa e passo a passo.',
        'domain.it.agent': 'Especialista em Suporte de TI',
        'domain.sales.name': 'Assistente de Vendas e Auxiliar de CRM',
        'domain.sales.desc': 'Uma ferramenta de capacitação de vendas que ajuda equipes de vendas com informações sobre produtos, preços, tratamento de objeções e técnicas de fechamento. Suporta todo o processo de vendas, da descoberta ao fechamento.',
        'domain.sales.agent': 'Assistente de Vendas',
        'domain.marketing.prompt': `Você é um Estrategista de Campanhas de Marketing especialista com conhecimento abrangente de planejamento de campanhas, mídias sociais, marketing de conteúdo e análise.

Seu papel é:
- Ajudar a planejar campanhas de marketing eficazes
- Sugerir canais e táticas apropriados
- Fornecer melhores práticas para cada canal de marketing
- Auxiliar na estratégia de conteúdo e mensagens
- Orientar medição e otimização de campanhas

Diretrizes:
- Comece com objetivos claros e público-alvo
- Recomende estratégias baseadas em dados
- Forneça ideias criativas mantendo-se estratégico
- Equilibre táticas de curto prazo com construção de marca de longo prazo
- Mantenha-se atualizado com tendências e plataformas de marketing
- Foque em resultados mensuráveis e ROI

Sempre alinhe recomendações com objetivos de negócio e recursos disponíveis.`,
        'domain.hr.prompt': `Você é um Consultor de Recursos Humanos especialista com profundo conhecimento de políticas de RH, administração de benefícios, leis trabalhistas e melhores práticas de gestão de funcionários.

Seu papel é:
- Fornecer orientação precisa sobre políticas da empresa
- Ajudar funcionários com perguntas sobre benefícios
- Orientar sobre procedimentos de folga e licença
- Auxiliar com questões relacionadas a nômina
- Esclarecer processos de RH e fluxos de trabalho

Diretrizes:
- Sempre consulte a documentação oficial da empresa
- Mantenha confidencialidade e profissionalismo
- Forneça orientação empática e útil
- Escale questões complexas ou sensíveis para profissionais de RH
- Mantenha-se neutro e imparcial
- Siga requisitos legais e regulatórios

Garanta que todas as informações sejam precisas e atualizadas com as políticas da empresa.`,
        'domain.support.prompt': `Você é um Especialista em Suporte ao Cliente com ampla experiência em solução de problemas de produtos, gerenciamento de contas e satisfação do cliente.

Seu papel é:
- Fornecer suporte rápido e útil ao cliente
- Solucionar problemas comuns de produtos
- Orientar clientes através de configurações e processos
- Auxiliar com gerenciamento e faturamento de contas
- Escalar questões complexas para agentes humanos quando apropriado

Diretrizes:
- Seja paciente, empático e profissional
- Forneça instruções claras passo a passo
- Verifique a compreensão antes de prosseguir
- Ofereça múltiplas soluções quando possível
- Documente questões comuns para melhorias futuras
- Foque na resolução de problemas e satisfação do cliente

Sempre priorize a experiência do cliente e forneça soluções precisas e úteis.`,
        'domain.it.prompt': `Você é um Especialista em Suporte de TI com conhecimento extensivo de infraestrutura de sistemas, aplicações de software, rede e segurança cibernética.

Seu papel é:
- Fornecer suporte técnico para problemas de hardware e software
- Orientar usuários através de instalação e configuração de software
- Solucionar problemas de rede e conectividade
- Educar usuários sobre melhores práticas de segurança
- Auxiliar com gerenciamento de contas e permissões

Diretrizes:
- Forneça instruções técnicas claras e passo a passo
- Ajuste explicações ao nível técnico do usuário
- Priorize segurança e melhores práticas
- Documente soluções para problemas comuns
- Escale questões críticas de sistema para equipes especializadas
- Mantenha-se atualizado com atualizações de sistemas e patches de segurança

Garanta que todas as orientações sigam políticas de TI e padrões de segurança da empresa.`,
        'domain.sales.prompt': `Você é um Consultor de Vendas especialista com profundo conhecimento de metodologias de vendas, conhecimento de produtos, análise competitiva e gerenciamento de relacionamento com clientes.

Seu papel é:
- Auxiliar com informações de produtos e posicionamento
- Fornecer orientação sobre preços e descontos
- Ajudar a superar objeções comuns de vendas
- Sugerir técnicas e estratégias de fechamento
- Apoiar processos de qualificação e descoberta de leads

Diretrizes:
- Foque em criar valor para o cliente
- Forneça informações precisas sobre produtos
- Sugira abordagens consultivas, não agressivas
- Entenda as necessidades do cliente antes de recomendar soluções
- Mantenha-se atualizado sobre concorrentes e tendências de mercado
- Alinhe estratégias de vendas com objetivos de negócio

Sempre priorize relacionamentos de longo prazo com clientes em vez de vitórias de curto prazo.`
    },

    spanish: {
        'page.title': 'Constructor de Agentes con IA',
        'page.subtitle': 'Describe tu agente y te ayudaré a construirlo paso a paso',
        'page.powered': 'Desarrollado por TD Agent Foundry • Plantilla PM Agent Squad Master',
        'api.settings': 'Configuración de API',

        'assistant.title': 'Asistente Agent Foundry',
        'assistant.subtitle': 'Tu asistente de construcción de agentes',
        'assistant.welcome': "👋 ¡Hola! Soy tu Asistente Agent Foundry. Te ayudaré a construir un Agente AI Foundry personalizado.",
        'assistant.start': "<strong>Empecemos:</strong> ¿Qué tipo de agente quieres construir? Describe lo que debe hacer.",
        'assistant.connected': '🟢 ¡Conectado a TD LLM API!',
        'assistant.connection.detail': 'Usando conexión local en el puerto 3001. Todas las respuestas provienen de TD AI a través de tu instalación de TD Agent Foundry.',
        'button.ask': 'Preguntar al Asistente',
        'button.stop': '⏹️ Detener Respuesta',
        'button.generate': '✨ Generar Agente Automáticamente',
        'button.cancel': '✖️ Cancelar Generación',
        'button.reset': '🔄 Empezar de Nuevo',
        'examples.title': 'Ejemplos Rápidos:',
        'example.campaign': '🎯 Construcción de Campaña',
        'example.optimization': '📊 Optimización de Campaña',
        'example.reporting': '📈 Informes de Campaña',

        'step.describe': 'Describir',
        'step.knowledge': 'Conocimiento',
        'step.project': 'Proyecto',
        'step.agent': 'Agente',
        'step.deploy': 'Desplegar',

        'step0.title': '🎯 Paso 0: Describe Tu Agente',
        'step0.info': '<strong>Construcción con IA:</strong> Dile a TD Agent Foundry lo que tu agente necesita hacer, y generará automáticamente bases de conocimiento, configuración y archivos de despliegue para ti.',
        'step0.purpose': '¿Cuál es el propósito de tu agente?',
        'step0.tone': '¿Qué tono debe tener tu agente?',
        'step0.audience': '¿Quién usará este agente?',
        'step0.hint': '¡Sé específico! Incluye qué debe hacer el agente, quién lo usará y qué conocimiento necesita.',
        'step0.tip': '<strong>💡 Consejo:</strong> Cuantos más detalles proporciones, mejor podrá la IA generar la configuración de tu agente. Incluye ejemplos específicos de preguntas que los usuarios puedan hacer o tareas con las que necesiten ayuda.',

        'tone.professional': 'Profesional y Formal',
        'tone.friendly': 'Amigable y Conversacional',
        'tone.empathetic': 'Empático y Solidario',
        'tone.technical': 'Técnico y Preciso',
        'tone.enthusiastic': 'Entusiasta y Enérgico',

        'step1.title': '📚 Paso 1: Revisar Bases de Conocimiento',
        'step1.info': '<strong>✨ Generado por IA:</strong> Basado en tu descripción, TD Agent Foundry creó estas bases de conocimiento para tu agente. Revisa y edita según sea necesario.',
        'step1.empty': 'Completa el Paso 0 para generar bases de conocimiento',
        'step1.kb.title': 'Base de Conocimiento',
        'step1.kb.content': 'Contenido',
        'step1.kb.characters': 'caracteres',
        'button.addkb': '➕ Agregar Otra Base de Conocimiento',
        'button.remove': 'Eliminar',
        'button.expand': 'Expandir',

        'step2.title': '⚙️ Paso 2: Revisar Configuración del Proyecto',
        'step2.info': '<strong>✨ Generado por IA:</strong> TD Agent Foundry configuró las definiciones de tu proyecto. Revisa y modifica si es necesario.',
        'step2.next': '<strong>📍 Siguiente Paso:</strong> Después de completar este asistente, abre <a href="https://console.treasuredata.com/app/agents" target="_blank" class="text-indigo-600 hover:text-indigo-800 underline font-semibold">Treasure Data → AI Agent Foundry</a> para desplegar tu agente.',
        'step2.name': 'Nombre del Proyecto',
        'step2.description': 'Descripción del Proyecto',

        'step3.title': '🤖 Paso 3: Revisar Configuración del Agente',
        'step3.info': '<strong>✨ Generado por IA:</strong> TD Agent Foundry seleccionó configuraciones ideales para tu agente. Personaliza si es necesario.',
        'step3.name': 'Nombre para Mostrar del Agente',
        'step3.model': 'Modelo de IA',
        'step3.temperature': 'Temperatura:',
        'step3.temp.tip': 'Menor = Más preciso y consistente | Mayor = Más creativo y variado',
        'step3.prompt': 'Prompt del Sistema',
        'step3.prompt.tip': 'Prompt del sistema generado por IA basado en tu descripción',
        'button.regenerate': '🔄 Regenerar',

        'step4.title': '🚀 Paso 4: Descargar y Desplegar',
        'step4.info': '<strong>✅ ¡Configuración Completa!</strong> Tu agente de IA está listo para desplegar. Descarga todos los archivos y sigue la guía de despliegue.',
        'step4.summary': 'Resumen de Configuración',
        'step4.agent.name': 'Nombre del Agente:',
        'step4.project': 'Proyecto:',
        'step4.model': 'Modelo de IA:',
        'step4.temperature': 'Temperatura:',
        'step4.kb': 'Bases de Conocimiento:',
        'step4.tools': 'Herramientas:',
        'button.viewoutput': '📄 Ver Página de Salida Copiable',
        'button.downloadkbs': '📚 Descargar Archivos de Base de Conocimiento (.md)',
        'button.downloadproject': '📋 Descargar Guía de Configuración del Proyecto',
        'button.downloadagent': '🤖 Descargar Configuración del Agente',
        'button.downloadall': '⬇️ Descargar Todos los Archivos',
        'button.autodeploy': '🚀 Auto-Desplegar en Agent Foundry',
        'deploy.steps': '📖 Próximos Pasos:',
        'deploy.step1': 'Descarga todos los archivos a tu computadora',
        'deploy.step2': 'Abre Agent Foundry',
        'deploy.step3': 'Crea un nuevo proyecto (usa la guía PROJECT_SETUP.md)',
        'deploy.step4': 'Sube los archivos de la base de conocimiento',
        'deploy.step5': 'Configura el agente (usa la guía AGENT_CONFIG.md)',
        'deploy.step6': '¡Prueba y despliega tu agente!',
        'deploy.comingsoon': 'Próximamente',

        'button.previous': '← Anterior',
        'button.next': 'Siguiente →',
        'step.of': 'Paso',
        'step.total': 'de 8',

        'error.required': '⚠️ Por favor, escribe un mensaje antes de enviar',
        'validation.description.required': '¡Por favor, describe tu agente primero! Agrega al menos una breve descripción de lo que debe hacer tu agente (mínimo 20 caracteres).',
        'validation.description.detailed': 'Por favor, proporciona una descripción detallada de tu agente (al menos 50 caracteres).',
        'validation.kb.required': 'Por favor, crea al menos una base de conocimiento.',
        'validation.kb.minimum': '¡Debes tener al menos una base de conocimiento!',
        'validation.kb.title.content': 'debe tener título y contenido.',
        'validation.kb.limit': 'excede el límite de 18,000 caracteres.',
        'validation.project.name': 'Por favor, ingresa un nombre de proyecto.',
        'validation.project.description': 'Por favor, ingresa una descripción del proyecto.',
        'validation.agent.name': 'Por favor, ingresa un nombre de agente.',
        'validation.agent.prompt': 'Por favor, proporciona un prompt del sistema.',
        'validation.ai.failed': 'La generación de IA falló. Usando generación basada en palabras clave.',
        'validation.copy.failed': 'Error al copiar: ',

        // Placeholders and examples
        'chat.placeholder': 'Ejemplo: Quiero construir un agente de planificación de campañas que ayude a los profesionales de marketing a crear campañas integrales en múltiples canales...',
        'example.text': 'Ejemplo: Quiero construir un agente de planificación de campañas que ayude a los profesionales de marketing...',
        'audience.placeholder': 'Ejemplo: Empleados de la empresa, clientes, miembros internos del equipo...',
        'connected.status': '🟢 ¡Conectado a TD LLM API! Usando conexión local en el puerto 3001. Todas las respuestas provienen de TD AI a través de tu instalación de TD Agent Foundry.',
        'quick.examples': 'Ejemplos Rápidos:',
        'tip.text': '💡 Consejo: Cuantos más detalles proporciones, mejor podrá la IA generar la configuración de tu agente. Incluye ejemplos específicos de preguntas que los usuarios puedan hacer o tareas con las que necesiten ayuda.',

        // Success messages
        'success.generated': '¡Agente generado con éxito!',
        'success.created': 'He creado:',
        'success.kb.count': 'bases de conocimiento',
        'success.project.config': 'Configuración del proyecto',
        'success.agent.settings': 'Configuraciones y prompt del sistema del agente',
        'success.next.step': '¡Haz clic en <strong>"Siguiente →"</strong> para revisar y personalizar cada componente!',

        // Sidebar messages
        'sidebar.step1.msg': '📚 ¡Genial! Revisa tus bases de conocimiento. Serán la base de la experiencia de tu agente.',
        'sidebar.step2.msg': '🔧 Ahora configuremos tu proyecto. He pre-rellenado los detalles basándome en tu descripción.',
        'sidebar.step3.msg': '🤖 ¡Casi listo! Revisa la configuración del agente. He optimizado el modelo y la temperatura para tu caso de uso.',
        'sidebar.step4.msg': '🎉 ¡Excelente! Tu agente está listo para desplegar. Descarga los archivos y sigue la guía de despliegue de Agent Foundry.',
        'sidebar.generating': '✨ Pidiendo a TD AI que genere la configuración de tu agente...',
        'sidebar.connected': '🟢 ¡Conectado a TD LLM API! Usando conexión local en el puerto 3001. Todas las respuestas provienen de TD AI a través de tu instalación de TD Agent Foundry.',

        // Domain-specific sample data
        'domain.marketing.name': 'Centro de Planificación de Campañas de Marketing',
        'domain.marketing.desc': 'Un estratega de campañas de marketing que ayuda con la planificación de campañas, creación de contenido, selección de canales y optimización del rendimiento. Ayuda a ejecutar estrategias de marketing efectivas.',
        'domain.marketing.agent': 'Estratega de Campañas de Marketing',
        'domain.marketing.prompt': `Eres un Estratega de Campañas de Marketing experto con conocimiento integral de planificación de campañas, redes sociales, marketing de contenidos y análisis.

Tu rol es:
- Ayudar a planificar campañas de marketing efectivas
- Sugerir canales y tácticas apropiados
- Proporcionar mejores prácticas para cada canal de marketing
- Asistir con estrategia de contenido y mensajes
- Guiar la medición y optimización de campañas

Directrices:
- Comenzar con objetivos claros y audiencia objetivo
- Recomendar estrategias basadas en datos
- Proporcionar ideas creativas mientras se mantiene estratégico
- Equilibrar tácticas a corto plazo con construcción de marca a largo plazo
- Mantenerse actualizado con tendencias y plataformas de marketing
- Enfocarse en resultados medibles y ROI

Siempre alinear las recomendaciones con los objetivos del negocio y los recursos disponibles.`,
        'domain.hr.name': 'Sistema de Soporte de RRHH para Empleados',
        'domain.hr.desc': 'Un asistente integral de RRHH que ayuda a los empleados con políticas de la empresa, beneficios, solicitudes de tiempo libre y consultas generales de RRHH. Proporciona soporte preciso y empático basado en la documentación de RRHH de la empresa.',
        'domain.hr.agent': 'Asistente de Soporte de RRHH',
        'domain.hr.prompt': `Eres un Consultor de Recursos Humanos experto con profundo conocimiento de políticas de RRHH, administración de beneficios, leyes laborales y mejores prácticas de gestión de empleados.

Tu rol es:
- Proporcionar orientación precisa sobre políticas de la empresa
- Ayudar a los empleados con preguntas sobre beneficios
- Guiar sobre procedimientos de tiempo libre y licencias
- Asistir con asuntos relacionados con nómina
- Aclarar procesos y flujos de trabajo de RRHH

Directrices:
- Siempre consultar la documentación oficial de la empresa
- Mantener confidencialidad y profesionalismo
- Proporcionar orientación empática y útil
- Escalar asuntos complejos o sensibles a profesionales de RRHH
- Mantener neutralidad e imparcialidad
- Seguir requisitos legales y regulatorios

Asegurar que toda la información sea precisa y esté actualizada con las políticas de la empresa.`,
        'domain.support.name': 'Plataforma de Asistente de Atención al Cliente',
        'domain.support.desc': 'Un sistema inteligente de atención al cliente que ayuda a los clientes con preguntas sobre productos, solución de problemas y gestión de cuentas. Escala problemas complejos a agentes humanos cuando es apropiado.',
        'domain.support.agent': 'Agente de Atención al Cliente',
        'domain.support.prompt': `Eres un Especialista en Atención al Cliente experto con amplia experiencia en solución de problemas de productos, gestión de cuentas y satisfacción del cliente.

Tu rol es:
- Proporcionar atención al cliente rápida y útil
- Solucionar problemas comunes de productos
- Guiar a los clientes a través de configuraciones y procesos
- Asistir con gestión de cuentas y facturación
- Escalar problemas complejos a agentes humanos cuando sea apropiado

Directrices:
- Ser paciente, empático y profesional
- Proporcionar instrucciones claras paso a paso
- Verificar la comprensión antes de continuar
- Ofrecer múltiples soluciones cuando sea posible
- Documentar problemas comunes para mejoras futuras
- Enfocarse en la resolución de problemas y satisfacción del cliente

Siempre priorizar la experiencia del cliente y proporcionar soluciones precisas y útiles.`,
        'domain.it.name': 'Mesa de Ayuda de Soporte de TI y Técnico',
        'domain.it.desc': 'Un asistente de soporte técnico que guía a los empleados a través de la configuración del sistema, instalación de software, solución de problemas y mejores prácticas de seguridad. Proporciona orientación técnica precisa y paso a paso.',
        'domain.it.agent': 'Especialista en Soporte de TI',
        'domain.it.prompt': `Eres un Especialista en Soporte de TI experto con conocimiento extensivo de infraestructura de sistemas, aplicaciones de software, redes y ciberseguridad.

Tu rol es:
- Proporcionar soporte técnico para problemas de hardware y software
- Guiar a los usuarios a través de la instalación y configuración de software
- Solucionar problemas de red y conectividad
- Educar a los usuarios sobre mejores prácticas de seguridad
- Asistir con gestión de cuentas y permisos

Directrices:
- Proporcionar instrucciones técnicas claras y paso a paso
- Ajustar las explicaciones al nivel técnico del usuario
- Priorizar seguridad y mejores prácticas
- Documentar soluciones para problemas comunes
- Escalar problemas críticos del sistema a equipos especializados
- Mantenerse actualizado con actualizaciones del sistema y parches de seguridad

Asegurar que toda la orientación siga las políticas de TI y los estándares de seguridad de la empresa.`,
        'domain.sales.name': 'Asistente de Ventas y Ayudante de CRM',
        'domain.sales.desc': 'Una herramienta de habilitación de ventas que ayuda a los equipos de ventas con información de productos, precios, manejo de objeciones y técnicas de cierre. Apoya todo el proceso de ventas desde el descubrimiento hasta el cierre.',
        'domain.sales.agent': 'Asistente de Ventas',
        'domain.sales.prompt': `Eres un Consultor de Ventas experto con profundo conocimiento de metodologías de ventas, conocimiento de productos, análisis competitivo y gestión de relaciones con clientes.

Tu rol es:
- Asistir con información y posicionamiento de productos
- Proporcionar orientación sobre precios y descuentos
- Ayudar a superar objeciones comunes de ventas
- Sugerir técnicas y estrategias de cierre
- Apoyar procesos de calificación y descubrimiento de leads

Directrices:
- Enfocarse en crear valor para el cliente
- Proporcionar información precisa sobre productos
- Sugerir enfoques consultivos, no agresivos
- Entender las necesidades del cliente antes de recomendar soluciones
- Mantenerse actualizado sobre competidores y tendencias del mercado
- Alinear estrategias de ventas con objetivos del negocio

Siempre priorizar las relaciones a largo plazo con los clientes sobre las victorias a corto plazo.`
    },

    japanese: {
        // Header
        'page.title': 'AI搭載エージェントビルダー',
        'page.subtitle': 'エージェントを説明すれば、ステップバイステップで構築をサポートします',
        'page.powered': 'TD Agent Foundry • PM Agent Squad Masterテンプレート',
        'api.settings': 'API設定',

        // Assistant Panel
        'assistant.title': 'Agent Foundryアシスタント',
        'assistant.subtitle': 'エージェント構築アシスタント',
        'assistant.welcome': '👋 こんにちは！Agent Foundryアシスタントです。カスタムAI Foundryエージェントの構築をお手伝いします。',
        'assistant.start': '<strong>始めましょう：</strong>どのようなエージェントを構築したいですか？その機能を説明してください。',
        'assistant.connected': '🟢 TD LLM APIに接続しました！',
        'assistant.connection.detail': 'ポート3001でローカル接続を使用しています。すべての応答はTD Agent Foundryインストール経由でTD AIから提供されます。',
        'button.ask': 'アシスタントに質問',
        'button.stop': '⏹️ 応答を停止',
        'button.generate': '✨ エージェントを自動生成',
        'button.cancel': '✖️ 生成をキャンセル',
        'button.reset': '🔄 最初からやり直す',
        'examples.title': 'クイック例：',
        'example.campaign': '🎯 キャンペーン構築',
        'example.optimization': '📊 キャンペーン最適化',
        'example.reporting': '📈 キャンペーンレポート',

        // Steps
        'step.describe': '説明',
        'step.knowledge': 'ナレッジ',
        'step.project': 'プロジェクト',
        'step.agent': 'エージェント',
        'step.deploy': 'デプロイ',

        // Step 0
        'step0.title': '🎯 ステップ0：エージェントを説明',
        'step0.info': '<strong>AI搭載構築：</strong>TD Agent Foundryにエージェントが必要とすることを伝えれば、ナレッジベース、設定、デプロイメントファイルを自動生成します。',
        'step0.purpose': 'エージェントの目的は何ですか？',
        'step0.tone': 'エージェントのトーンは？',
        'step0.audience': '誰がこのエージェントを使用しますか？',
        'step0.hint': '具体的に記述してください！エージェントが何をすべきか、誰が使用するか、どのような知識が必要かを含めてください。',
        'step0.tip': '<strong>💡 ヒント：</strong>詳細を提供するほど、AIはより良いエージェント設定を生成できます。ユーザーが尋ねる可能性のある質問や必要なタスクの具体例を含めてください。',

        // Tone options
        'tone.professional': 'プロフェッショナル＆フォーマル',
        'tone.friendly': 'フレンドリー＆会話的',
        'tone.empathetic': '共感的＆サポート的',
        'tone.technical': '技術的＆正確',
        'tone.enthusiastic': '熱意的＆エネルギッシュ',

        // Step 1
        'step1.title': '📚 ステップ1：ナレッジベースを確認',
        'step1.info': '<strong>✨ AI生成：</strong>あなたの説明に基づいて、TD Agent Foundryがエージェント用のナレッジベースを作成しました。必要に応じて確認・編集してください。',
        'step1.empty': 'ステップ0を完了してナレッジベースを生成',
        'step1.kb.title': 'ナレッジベース',
        'step1.kb.content': 'コンテンツ',
        'step1.kb.characters': '文字',
        'button.addkb': '➕ ナレッジベースを追加',
        'button.remove': '削除',
        'button.expand': '展開',

        // Step 2
        'step2.title': '⚙️ ステップ2：プロジェクト設定を確認',
        'step2.info': '<strong>✨ AI生成：</strong>TD Agent Foundryがプロジェクト設定を構成しました。必要に応じて確認・変更してください。',
        'step2.next': '<strong>📍 次のステップ：</strong>このウィザードを完了したら、<a href="https://console.treasuredata.com/app/agents" target="_blank" class="text-indigo-600 hover:text-indigo-800 underline font-semibold">Treasure Data → AI Agent Foundry</a>を開いてエージェントをデプロイしてください。',
        'step2.name': 'プロジェクト名',
        'step2.description': 'プロジェクト説明',

        // Step 3
        'step3.title': '🤖 ステップ3：エージェント設定を確認',
        'step3.info': '<strong>✨ AI生成：</strong>TD Agent Foundryがエージェントの最適な設定を選択しました。必要に応じてカスタマイズしてください。',
        'step3.name': 'エージェント表示名',
        'step3.model': 'AIモデル',
        'step3.temperature': '温度：',
        'step3.temp.tip': '低 = より正確で一貫性 | 高 = より創造的で多様性',
        'step3.prompt': 'システムプロンプト',
        'step3.prompt.tip': '説明に基づいてAI生成されたシステムプロンプト',
        'button.regenerate': '🔄 再生成',

        // Step 4
        'step4.title': '🚀 ステップ4：ダウンロード＆デプロイ',
        'step4.summary': '設定サマリー',
        'step4.agent.name': 'エージェント名：',
        'step4.project': 'プロジェクト：',
        'step4.model': 'AIモデル：',
        'step4.temperature': '温度：',
        'step4.kb': 'ナレッジベース：',
        'step4.tools': 'ツール：',
        'step4.info': '<strong>✅ 設定完了！</strong>AIエージェントのデプロイ準備が整いました。すべてのファイルをダウンロードしてデプロイメントガイドに従ってください。',
        'button.viewoutput': '📄 コピー可能な出力ページを表示',
        'button.downloadkbs': '📚 ナレッジベースファイルをダウンロード（.md）',
        'button.downloadproject': '📋 プロジェクト設定ガイドをダウンロード',
        'button.downloadagent': '🤖 エージェント設定をダウンロード',
        'button.downloadall': '⬇️ すべてのファイルをダウンロード',
        'button.autodeploy': '🚀 Agent Foundryに自動デプロイ',
        'deploy.steps': '📖 次のステップ：',
        'deploy.step1': 'すべてのファイルをコンピュータにダウンロード',
        'deploy.step2': 'Agent Foundryを開く',
        'deploy.step3': '新しいプロジェクトを作成（PROJECT_SETUP.mdガイドを使用）',
        'deploy.step4': 'ナレッジベースファイルをアップロード',
        'deploy.step5': 'エージェントを設定（AGENT_CONFIG.mdガイドを使用）',
        'deploy.step6': 'エージェントをテストしてデプロイ！',
        'deploy.comingsoon': '近日公開',

        // Navigation
        'button.previous': '← 前へ',
        'button.next': '次へ →',
        'step.of': 'ステップ',
        'step.total': '/ 8',

        // Validation
        'error.required': '⚠️ 送信する前にメッセージを入力してください',
        'validation.description.required': 'まずエージェントを説明してください！エージェントが何をすべきかの簡単な説明を追加してください（最低20文字）。',
        'validation.description.detailed': 'エージェントの詳細な説明を提供してください（最低50文字）。',
        'validation.kb.required': '少なくとも1つのナレッジベースを作成してください。',
        'validation.kb.minimum': '少なくとも1つのナレッジベースが必要です！',
        'validation.kb.title.content': 'タイトルとコンテンツの両方が必要です。',
        'validation.kb.limit': '18,000文字の制限を超えています。',
        'validation.project.name': 'プロジェクト名を入力してください。',
        'validation.project.description': 'プロジェクトの説明を入力してください。',
        'validation.agent.name': 'エージェント名を入力してください。',
        'validation.agent.prompt': 'システムプロンプトを提供してください。',
        'validation.ai.failed': 'AI生成に失敗しました。キーワードベースの生成を使用します。',
        'validation.copy.failed': 'コピーに失敗しました：',

        // Placeholders and examples
        'chat.placeholder': '例：マルチチャネルでの包括的なマーケティングキャンペーンの作成をマーケターに支援するキャンペーン計画エージェントを構築したいです...',
        'example.text': '例：マーケターが複数のチャネルで包括的なマーケティングキャンペーンを作成するのを支援するキャンペーン計画エージェントを構築したいです...',
        'audience.placeholder': '例：社員、顧客、社内チームメンバー...',
        'connected.status': '🟢 TD LLM APIに接続しました！ポート3001でローカル接続を使用しています。すべての応答はTD Agent Foundryインストール経由でTD AIから提供されます。',
        'quick.examples': 'クイック例：',
        'tip.text': '💡 ヒント：詳細を提供するほど、AIはより良いエージェント設定を生成できます。ユーザーが尋ねる可能性のある質問や必要なタスクの具体例を含めてください。',

        // Success messages
        'success.generated': 'エージェントが正常に生成されました！',
        'success.created': '作成したもの：',
        'success.kb.count': 'ナレッジベース',
        'success.project.config': 'プロジェクト設定',
        'success.agent.settings': 'エージェント設定とシステムプロンプト',
        'success.next.step': '<strong>「次へ →」</strong>をクリックして、各コンポーネントを確認・カスタマイズしてください！',

        // Sidebar messages
        'sidebar.step1.msg': '📚 すばらしい！ナレッジベースを確認してください。これらがエージェントの専門知識の基盤となります。',
        'sidebar.step2.msg': '🔧 次はプロジェクトを設定しましょう。説明に基づいて詳細を事前入力しました。',
        'sidebar.step3.msg': '🤖 もう少しです！エージェント設定を確認してください。ユースケースに合わせてモデルと温度を最適化しました。',
        'sidebar.step4.msg': '🎉 完璧です！エージェントのデプロイ準備が整いました。ファイルをダウンロードしてAgent Foundryデプロイメントガイドに従ってください。',
        'sidebar.generating': '✨ TD AIにエージェント設定の生成を依頼しています...',
        'sidebar.connected': '🟢 TD LLM APIに接続しました！ポート3001でローカル接続を使用しています。すべての応答はTD Agent Foundryインストール経由でTD AIから提供されます。',

        // Domain-specific sample data
        'domain.marketing.name': 'マーケティングキャンペーン計画ハブ',
        'domain.marketing.desc': 'キャンペーン計画、コンテンツ作成、チャネル選択、パフォーマンス最適化を支援するマーケティングキャンペーンストラテジスト。効果的なマーケティング戦略の実行をサポートします。',
        'domain.marketing.agent': 'マーケティングキャンペーン戦略アドバイザー',
        'domain.hr.name': '従業員HR支援システム',
        'domain.hr.desc': '会社の方針、福利厚生、休暇申請、一般的なHRに関する問い合わせについて従業員を支援する包括的なHRアシスタント。会社のHR文書に基づいて正確で共感的なサポートを提供します。',
        'domain.hr.agent': 'HR支援アシスタント',
        'domain.support.name': 'カスタマーサポートアシスタントプラットフォーム',
        'domain.support.desc': '製品に関する質問、トラブルシューティング、アカウント管理で顧客を支援するインテリジェントなカスタマーサポートシステム。複雑な問題は適切な場合に人間のエージェントにエスカレートします。',
        'domain.support.agent': 'カスタマーサポートエージェント',
        'domain.it.name': 'ITサポート＆テクニカルヘルプデスク',
        'domain.it.desc': 'システムセットアップ、ソフトウェアインストール、トラブルシューティング、セキュリティベストプラクティスを通じて従業員をガイドするテクニカルサポートアシスタント。正確で段階的なテクニカルガイダンスを提供します。',
        'domain.it.agent': 'ITサポートスペシャリスト',
        'domain.sales.name': 'セールスアシスタント＆CRMヘルパー',
        'domain.sales.desc': '製品情報、価格設定、異議処理、クロージング技術について営業チームを支援する営業支援ツール。発見からクロージングまでの営業プロセス全体をサポートします。',
        'domain.sales.agent': 'セールスアシスタント',
        'domain.marketing.prompt': `あなたはキャンペーン計画、ソーシャルメディア、コンテンツマーケティング、分析に関する包括的な知識を持つマーケティングキャンペーン戦略の専門家です。

あなたの役割：
- 効果的なマーケティングキャンペーンの計画を支援
- 適切なチャネルと戦術を提案
- 各マーケティングチャネルのベストプラクティスを提供
- コンテンツ戦略とメッセージングを支援
- キャンペーンの測定と最適化をガイド

ガイドライン：
- 明確な目標とターゲットオーディエンスから始める
- データに基づいた戦略を推奨
- 戦略的でありながら創造的なアイデアを提供
- 短期的な戦術と長期的なブランド構築のバランスを取る
- マーケティングのトレンドとプラットフォームに常に対応
- 測定可能な結果とROIに焦点を当てる

常に推奨事項をビジネス目標と利用可能なリソースに合わせてください。`,
        'domain.hr.prompt': `あなたはHRポリシー、福利厚生管理、労働法、従業員管理のベストプラクティスに関する深い知識を持つ人事コンサルタントの専門家です。

あなたの役割：
- 会社のポリシーに関する正確なガイダンスを提供
- 福利厚生に関する質問で従業員を支援
- 休暇と休業の手続きをガイド
- 給与関連の問題を支援
- HRプロセスとワークフローを明確化

ガイドライン：
- 常に公式の会社文書を参照
- 機密性とプロフェッショナリズムを維持
- 共感的で有用なガイダンスを提供
- 複雑または機密性の高い問題はHR専門家にエスカレート
- 中立性と公平性を保つ
- 法的および規制要件に従う

すべての情報が正確で会社のポリシーと最新であることを確認してください。`,
        'domain.support.prompt': `あなたは製品のトラブルシューティング、アカウント管理、顧客満足度に関する豊富な経験を持つカスタマーサポートスペシャリストです。

あなたの役割：
- 迅速で役立つ顧客サポートを提供
- 一般的な製品の問題をトラブルシューティング
- セットアップとプロセスを通じて顧客をガイド
- アカウント管理と請求を支援
- 適切な場合は複雑な問題を人間のエージェントにエスカレート

ガイドライン：
- 忍耐強く、共感的で、プロフェッショナルに
- 明確なステップバイステップの指示を提供
- 進む前に理解を確認
- 可能な場合は複数の解決策を提供
- 将来の改善のために一般的な問題を文書化
- 問題解決と顧客満足度に焦点を当てる

常に顧客体験を優先し、正確で役立つ解決策を提供してください。`,
        'domain.it.prompt': `あなたはシステムインフラストラクチャ、ソフトウェアアプリケーション、ネットワーキング、サイバーセキュリティに関する幅広い知識を持つITサポートスペシャリストです。

あなたの役割：
- ハードウェアとソフトウェアの問題に対するテクニカルサポートを提供
- ソフトウェアのインストールと設定をユーザーにガイド
- ネットワークと接続の問題をトラブルシューティング
- セキュリティのベストプラクティスについてユーザーを教育
- アカウント管理と権限を支援

ガイドライン：
- 明確でステップバイステップの技術指示を提供
- ユーザーの技術レベルに合わせて説明を調整
- セキュリティとベストプラクティスを優先
- 一般的な問題の解決策を文書化
- 重要なシステムの問題は専門チームにエスカレート
- システムアップデートとセキュリティパッチに常に対応

すべてのガイダンスが会社のITポリシーとセキュリティ基準に従っていることを確認してください。`,
        'domain.sales.prompt': `あなたは営業手法、製品知識、競合分析、顧客関係管理に関する深い知識を持つ営業コンサルタントの専門家です。

あなたの役割：
- 製品情報とポジショニングを支援
- 価格設定と割引に関するガイダンスを提供
- 一般的な営業上の異議を克服するのを支援
- クロージング技術と戦略を提案
- リード資格と発見プロセスをサポート

ガイドライン：
- 顧客価値の創出に焦点を当てる
- 正確な製品情報を提供
- 押し付けがましくない、コンサルタティブなアプローチを提案
- 解決策を推奨する前に顧客のニーズを理解
- 競合他社と市場トレンドに常に対応
- 営業戦略をビジネス目標に合わせる

常に短期的な勝利よりも長期的な顧客関係を優先してください。`
    },

    french: {
        'page.title': 'Constructeur d\'Agents IA',
        'page.subtitle': 'Décrivez votre agent et je vous aiderai à le construire étape par étape',
        'page.powered': 'Propulsé par TD Agent Foundry • Modèle PM Agent Squad Master',
        'api.settings': 'Paramètres API',

        'assistant.title': 'Assistant Agent Foundry',
        'assistant.subtitle': 'Votre assistant de création d\'agents',
        'assistant.welcome': "👋 Bonjour ! Je suis votre Assistant Agent Foundry. Je vais vous aider à créer un Agent AI Foundry personnalisé.",
        'assistant.start': "<strong>Commençons :</strong> Quel type d'agent souhaitez-vous créer ? Décrivez ce qu'il doit faire.",
        'assistant.connected': '🟢 Connecté à TD LLM API !',
        'assistant.connection.detail': 'Utilisation de la connexion locale sur le port 3001. Toutes les réponses proviennent de TD AI via votre installation TD Agent Foundry.',
        'button.ask': 'Demander à l\'Assistant',
        'button.stop': '⏹️ Arrêter la Réponse',
        'button.generate': '✨ Générer l\'Agent Automatiquement',
        'button.cancel': '✖️ Annuler la Génération',
        'button.reset': '🔄 Recommencer',
        'examples.title': 'Exemples Rapides :',
        'example.campaign': '🎯 Construction de Campagne',
        'example.optimization': '📊 Optimisation de Campagne',
        'example.reporting': '📈 Rapports de Campagne',

        'step.describe': 'Décrire',
        'step.knowledge': 'Connaissances',
        'step.project': 'Projet',
        'step.agent': 'Agent',
        'step.deploy': 'Déployer',

        'step0.title': '🎯 Étape 0 : Décrivez Votre Agent',
        'step0.info': '<strong>Construction IA :</strong> Dites à TD Agent Foundry ce que votre agent doit faire, et il générera automatiquement des bases de connaissances, une configuration et des fichiers de déploiement pour vous.',
        'step0.purpose': 'Quel est l\'objectif de votre agent ?',
        'step0.tone': 'Quel ton votre agent doit-il avoir ?',
        'step0.audience': 'Qui utilisera cet agent ?',
        'step0.hint': 'Soyez précis ! Incluez ce que l\'agent doit faire, qui l\'utilisera et quelles connaissances il nécessite.',
        'step0.tip': '<strong>💡 Astuce :</strong> Plus vous fournissez de détails, mieux l\'IA peut générer la configuration de votre agent. Incluez des exemples spécifiques de questions que les utilisateurs pourraient poser ou de tâches pour lesquelles ils ont besoin d\'aide.',

        'tone.professional': 'Professionnel et Formel',
        'tone.friendly': 'Amical et Conversationnel',
        'tone.empathetic': 'Empathique et Solidaire',
        'tone.technical': 'Technique et Précis',
        'tone.enthusiastic': 'Enthousiaste et Énergique',

        'step1.title': '📚 Étape 1 : Examiner les Bases de Connaissances',
        'step1.info': '<strong>✨ Généré par IA :</strong> Sur la base de votre description, TD Agent Foundry a créé ces bases de connaissances pour votre agent. Examinez et modifiez si nécessaire.',
        'step1.empty': 'Complétez l\'Étape 0 pour générer des bases de connaissances',
        'step1.kb.title': 'Base de Connaissances',
        'step1.kb.content': 'Contenu',
        'step1.kb.characters': 'caractères',
        'button.addkb': '➕ Ajouter une Autre Base de Connaissances',
        'button.remove': 'Supprimer',
        'button.expand': 'Développer',

        'step2.title': '⚙️ Étape 2 : Examiner la Configuration du Projet',
        'step2.info': '<strong>✨ Généré par IA :</strong> TD Agent Foundry a configuré les paramètres de votre projet. Examinez et modifiez si nécessaire.',
        'step2.next': '<strong>📍 Prochaine Étape :</strong> Après avoir terminé cet assistant, ouvrez <a href="https://console.treasuredata.com/app/agents" target="_blank" class="text-indigo-600 hover:text-indigo-800 underline font-semibold">Treasure Data → AI Agent Foundry</a> pour déployer votre agent.',
        'step2.name': 'Nom du Projet',
        'step2.description': 'Description du Projet',

        'step3.title': '🤖 Étape 3 : Examiner la Configuration de l\'Agent',
        'step3.info': '<strong>✨ Généré par IA :</strong> TD Agent Foundry a sélectionné des paramètres idéaux pour votre agent. Personnalisez si nécessaire.',
        'step3.name': 'Nom d\'Affichage de l\'Agent',
        'step3.model': 'Modèle IA',
        'step3.temperature': 'Température :',
        'step3.temp.tip': 'Bas = Plus précis et cohérent | Élevé = Plus créatif et varié',
        'step3.prompt': 'Prompt Système',
        'step3.prompt.tip': 'Prompt système généré par IA basé sur votre description',
        'button.regenerate': '🔄 Régénérer',

        'step4.title': '🚀 Étape 4 : Télécharger et Déployer',
        'step4.info': '<strong>✅ Configuration Terminée !</strong> Votre agent IA est prêt à être déployé. Téléchargez tous les fichiers et suivez le guide de déploiement.',
        'step4.summary': 'Résumé de la Configuration',
        'step4.agent.name': 'Nom de l\'Agent :',
        'step4.project': 'Projet :',
        'step4.model': 'Modèle IA :',
        'step4.temperature': 'Température :',
        'step4.kb': 'Bases de Connaissances :',
        'step4.tools': 'Outils :',
        'button.viewoutput': '📄 Voir la Page de Sortie Copiable',
        'button.downloadkbs': '📚 Télécharger les Fichiers de Base de Connaissances (.md)',
        'button.downloadproject': '📋 Télécharger le Guide de Configuration du Projet',
        'button.downloadagent': '🤖 Télécharger la Configuration de l\'Agent',
        'button.downloadall': '⬇️ Télécharger Tous les Fichiers',
        'button.autodeploy': '🚀 Déploiement Automatique sur Agent Foundry',
        'deploy.steps': '📖 Prochaines Étapes :',
        'deploy.step1': 'Téléchargez tous les fichiers sur votre ordinateur',
        'deploy.step2': 'Ouvrez Agent Foundry',
        'deploy.step3': 'Créez un nouveau projet (utilisez le guide PROJECT_SETUP.md)',
        'deploy.step4': 'Téléversez les fichiers de base de connaissances',
        'deploy.step5': 'Configurez l\'agent (utilisez le guide AGENT_CONFIG.md)',
        'deploy.step6': 'Testez et déployez votre agent !',
        'deploy.comingsoon': 'Prochainement',

        'button.previous': '← Précédent',
        'button.next': 'Suivant →',
        'step.of': 'Étape',
        'step.total': 'sur 8',

        'error.required': '⚠️ Veuillez saisir un message avant d\'envoyer',
        'validation.description.required': 'Veuillez d\'abord décrire votre agent ! Ajoutez au moins une brève description de ce que votre agent doit faire (minimum 20 caractères).',
        'validation.description.detailed': 'Veuillez fournir une description détaillée de votre agent (au moins 50 caractères).',
        'validation.kb.required': 'Veuillez créer au moins une base de connaissances.',
        'validation.kb.minimum': 'Vous devez avoir au moins une base de connaissances !',
        'validation.kb.title.content': 'doit avoir un titre et un contenu.',
        'validation.kb.limit': 'dépasse la limite de 18 000 caractères.',
        'validation.project.name': 'Veuillez saisir un nom de projet.',
        'validation.project.description': 'Veuillez saisir une description du projet.',
        'validation.agent.name': 'Veuillez saisir un nom d\'agent.',
        'validation.agent.prompt': 'Veuillez fournir un prompt système.',
        'validation.ai.failed': 'La génération IA a échoué. Utilisation de la génération basée sur les mots-clés.',
        'validation.copy.failed': 'Échec de la copie : ',

        // Placeholders and examples
        'chat.placeholder': 'Exemple : Je veux créer un agent de planification de campagnes qui aide les professionnels du marketing à créer des campagnes complètes sur plusieurs canaux...',
        'example.text': 'Exemple : Je veux créer un agent de planification de campagnes qui aide les professionnels du marketing...',
        'audience.placeholder': 'Exemple : Employés de l\'entreprise, clients, membres internes de l\'équipe...',
        'connected.status': '🟢 Connecté à TD LLM API ! Utilisation de la connexion locale sur le port 3001. Toutes les réponses proviennent de TD AI via votre installation TD Agent Foundry.',
        'quick.examples': 'Exemples Rapides :',
        'tip.text': '💡 Astuce : Plus vous fournissez de détails, mieux l\'IA peut générer la configuration de votre agent. Incluez des exemples spécifiques de questions que les utilisateurs pourraient poser ou de tâches pour lesquelles ils ont besoin d\'aide.',

        // Success messages
        'success.generated': 'Agent généré avec succès !',
        'success.created': 'J\'ai créé :',
        'success.kb.count': 'bases de connaissances',
        'success.project.config': 'Configuration du projet',
        'success.agent.settings': 'Paramètres et prompt système de l\'agent',
        'success.next.step': 'Cliquez sur <strong>"Suivant →"</strong> pour examiner et personnaliser chaque composant !',

        // Sidebar messages
        'sidebar.step1.msg': '📚 Super ! Examinez vos bases de connaissances. Elles seront le fondement de l\'expertise de votre agent.',
        'sidebar.step2.msg': '🔧 Maintenant, configurons votre projet. J\'ai pré-rempli les détails en fonction de votre description.',
        'sidebar.step3.msg': '🤖 Presque terminé ! Examinez les paramètres de l\'agent. J\'ai optimisé le modèle et la température pour votre cas d\'utilisation.',
        'sidebar.step4.msg': '🎉 Excellent ! Votre agent est prêt à être déployé. Téléchargez les fichiers et suivez le guide de déploiement Agent Foundry.',
        'sidebar.generating': '✨ Demande à TD AI de générer la configuration de votre agent...',
        'sidebar.connected': '🟢 Connecté à TD LLM API ! Utilisation de la connexion locale sur le port 3001. Toutes les réponses proviennent de TD AI via votre installation TD Agent Foundry.',

        // Domain-specific sample data
        'domain.marketing.name': 'Centre de Planification de Campagnes Marketing',
        'domain.marketing.desc': 'Un stratège de campagnes marketing qui aide à la planification de campagnes, la création de contenu, la sélection de canaux et l\'optimisation des performances. Aide à exécuter des stratégies marketing efficaces.',
        'domain.marketing.agent': 'Stratège de Campagnes Marketing',
        'domain.marketing.prompt': `Vous êtes un Stratège de Campagnes Marketing expert avec une connaissance approfondie de la planification de campagnes, des médias sociaux, du marketing de contenu et des analyses.

Votre rôle est de :
- Aider à planifier des campagnes marketing efficaces
- Suggérer des canaux et des tactiques appropriés
- Fournir les meilleures pratiques pour chaque canal marketing
- Assister avec la stratégie de contenu et la messagerie
- Guider la mesure et l'optimisation des campagnes

Directives :
- Commencer par des objectifs clairs et un public cible
- Recommander des stratégies basées sur les données
- Fournir des idées créatives tout en restant stratégique
- Équilibrer les tactiques à court terme avec la construction de marque à long terme
- Rester à jour avec les tendances et plateformes marketing
- Se concentrer sur les résultats mesurables et le ROI

Toujours aligner les recommandations avec les objectifs commerciaux et les ressources disponibles.`,
        'domain.hr.name': 'Système de Support RH pour Employés',
        'domain.hr.desc': 'Un assistant RH complet qui aide les employés avec les politiques de l\'entreprise, les avantages sociaux, les demandes de congés et les requêtes RH générales. Fournit un support précis et empathique basé sur la documentation RH de l\'entreprise.',
        'domain.hr.agent': 'Assistant de Support RH',
        'domain.hr.prompt': `Vous êtes un Consultant en Ressources Humaines expert avec une connaissance approfondie des politiques RH, de l'administration des avantages sociaux, du droit du travail et des meilleures pratiques de gestion des employés.

Votre rôle est de :
- Fournir des conseils précis sur les politiques de l'entreprise
- Aider les employés avec les questions sur les avantages sociaux
- Guider sur les procédures de congés et d'absences
- Assister avec les questions liées à la paie
- Clarifier les processus et flux de travail RH

Directives :
- Toujours consulter la documentation officielle de l'entreprise
- Maintenir la confidentialité et le professionnalisme
- Fournir des conseils empathiques et utiles
- Escalader les questions complexes ou sensibles aux professionnels RH
- Rester neutre et impartial
- Suivre les exigences légales et réglementaires

Assurez-vous que toutes les informations sont exactes et à jour avec les politiques de l'entreprise.`,
        'domain.support.name': 'Plateforme d\'Assistant de Support Client',
        'domain.support.desc': 'Un système de support client intelligent qui aide les clients avec les questions sur les produits, le dépannage et la gestion de compte. Escalade les problèmes complexes aux agents humains le cas échéant.',
        'domain.support.agent': 'Agent de Support Client',
        'domain.support.prompt': `Vous êtes un Spécialiste du Support Client expert avec une vaste expérience en dépannage de produits, gestion de comptes et satisfaction client.

Votre rôle est de :
- Fournir un support client rapide et utile
- Dépanner les problèmes de produits courants
- Guider les clients à travers les configurations et processus
- Assister avec la gestion de compte et la facturation
- Escalader les problèmes complexes aux agents humains le cas échéant

Directives :
- Être patient, empathique et professionnel
- Fournir des instructions claires étape par étape
- Vérifier la compréhension avant de continuer
- Offrir plusieurs solutions lorsque possible
- Documenter les problèmes courants pour les améliorations futures
- Se concentrer sur la résolution de problèmes et la satisfaction client

Toujours prioriser l'expérience client et fournir des solutions précises et utiles.`,
        'domain.it.name': 'Support IT et Help Desk Technique',
        'domain.it.desc': 'Un assistant de support technique qui guide les employés à travers la configuration système, l\'installation de logiciels, le dépannage et les meilleures pratiques de sécurité. Fournit des conseils techniques précis étape par étape.',
        'domain.it.agent': 'Spécialiste du Support IT',
        'domain.it.prompt': `Vous êtes un Spécialiste du Support IT expert avec une connaissance approfondie de l'infrastructure système, des applications logicielles, des réseaux et de la cybersécurité.

Votre rôle est de :
- Fournir un support technique pour les problèmes matériels et logiciels
- Guider les utilisateurs à travers l'installation et la configuration de logiciels
- Dépanner les problèmes de réseau et de connectivité
- Éduquer les utilisateurs sur les meilleures pratiques de sécurité
- Assister avec la gestion de comptes et les permissions

Directives :
- Fournir des instructions techniques claires étape par étape
- Adapter les explications au niveau technique de l'utilisateur
- Prioriser la sécurité et les meilleures pratiques
- Documenter les solutions pour les problèmes courants
- Escalader les problèmes système critiques aux équipes spécialisées
- Rester à jour avec les mises à jour système et les correctifs de sécurité

Assurez-vous que tous les conseils suivent les politiques IT et les normes de sécurité de l'entreprise.`,
        'domain.sales.name': 'Assistant de Vente et Aide CRM',
        'domain.sales.desc': 'Un outil d\'habilitation des ventes qui aide les équipes de vente avec les informations sur les produits, les prix, la gestion des objections et les techniques de closing. Soutient l\'ensemble du processus de vente, de la découverte à la conclusion.',
        'domain.sales.agent': 'Assistant de Vente',
        'domain.sales.prompt': `Vous êtes un Consultant en Ventes expert avec une connaissance approfondie des méthodologies de vente, de la connaissance des produits, de l'analyse concurrentielle et de la gestion de la relation client.

Votre rôle est de :
- Assister avec les informations et le positionnement des produits
- Fournir des conseils sur les prix et les remises
- Aider à surmonter les objections de vente courantes
- Suggérer des techniques et stratégies de closing
- Soutenir les processus de qualification et de découverte de leads

Directives :
- Se concentrer sur la création de valeur client
- Fournir des informations précises sur les produits
- Suggérer des approches consultatives, pas agressives
- Comprendre les besoins du client avant de recommander des solutions
- Rester à jour sur les concurrents et les tendances du marché
- Aligner les stratégies de vente avec les objectifs commerciaux

Toujours prioriser les relations client à long terme plutôt que les victoires à court terme.`
    },

    italian: {
        'page.title': 'Costruttore di Agenti IA',
        'page.subtitle': 'Descrivi il tuo agente e ti aiuterò a costruirlo passo dopo passo',
        'page.powered': 'Realizzato da TD Agent Foundry • Modello PM Agent Squad Master',
        'api.settings': 'Impostazioni API',

        'assistant.title': 'Assistente Agent Foundry',
        'assistant.subtitle': 'Il tuo assistente per la creazione di agenti',
        'assistant.welcome': "👋 Ciao! Sono il tuo Assistente Agent Foundry. Ti aiuterò a creare un Agente AI Foundry personalizzato.",
        'assistant.start': "<strong>Iniziamo:</strong> Che tipo di agente vuoi creare? Descrivi cosa dovrebbe fare.",
        'assistant.connected': '🟢 Connesso a TD LLM API!',
        'assistant.connection.detail': 'Utilizzo della connessione locale sulla porta 3001. Tutte le risposte provengono da TD AI tramite la tua installazione di TD Agent Foundry.',
        'button.ask': 'Chiedi all\'Assistente',
        'button.stop': '⏹️ Ferma Risposta',
        'button.generate': '✨ Genera Agente Automaticamente',
        'button.cancel': '✖️ Annulla Generazione',
        'button.reset': '🔄 Ricomincia',
        'examples.title': 'Esempi Rapidi:',
        'example.campaign': '🎯 Costruzione Campagna',
        'example.optimization': '📊 Ottimizzazione Campagna',
        'example.reporting': '📈 Report Campagna',

        'step.describe': 'Descrivi',
        'step.knowledge': 'Conoscenza',
        'step.project': 'Progetto',
        'step.agent': 'Agente',
        'step.deploy': 'Distribuisci',

        'step0.title': '🎯 Passo 0: Descrivi il Tuo Agente',
        'step0.info': '<strong>Costruzione IA:</strong> Dì a TD Agent Foundry cosa deve fare il tuo agente e genererà automaticamente basi di conoscenza, configurazione e file di distribuzione per te.',
        'step0.purpose': 'Qual è lo scopo del tuo agente?',
        'step0.tone': 'Che tono dovrebbe avere il tuo agente?',
        'step0.audience': 'Chi userà questo agente?',
        'step0.hint': 'Sii specifico! Includi cosa dovrebbe fare l\'agente, chi lo userà e quale conoscenza necessita.',
        'step0.tip': '<strong>💡 Suggerimento:</strong> Più dettagli fornisci, meglio l\'IA può generare la configurazione del tuo agente. Includi esempi specifici di domande che gli utenti potrebbero fare o compiti per cui hanno bisogno di aiuto.',

        'tone.professional': 'Professionale e Formale',
        'tone.friendly': 'Amichevole e Colloquiale',
        'tone.empathetic': 'Empatico e Solidale',
        'tone.technical': 'Tecnico e Preciso',
        'tone.enthusiastic': 'Entusiasta ed Energico',

        'step1.title': '📚 Passo 1: Rivedi le Basi di Conoscenza',
        'step1.info': '<strong>✨ Generato da IA:</strong> In base alla tua descrizione, TD Agent Foundry ha creato queste basi di conoscenza per il tuo agente. Rivedi e modifica se necessario.',
        'step1.empty': 'Completa il Passo 0 per generare le basi di conoscenza',
        'step1.kb.title': 'Base di Conoscenza',
        'step1.kb.content': 'Contenuto',
        'step1.kb.characters': 'caratteri',
        'button.addkb': '➕ Aggiungi Altra Base di Conoscenza',
        'button.remove': 'Rimuovi',
        'button.expand': 'Espandi',

        'step2.title': '⚙️ Passo 2: Rivedi la Configurazione del Progetto',
        'step2.info': '<strong>✨ Generato da IA:</strong> TD Agent Foundry ha configurato le impostazioni del tuo progetto. Rivedi e modifica se necessario.',
        'step2.next': '<strong>📍 Prossimo Passo:</strong> Dopo aver completato questo assistente, apri <a href="https://console.treasuredata.com/app/agents" target="_blank" class="text-indigo-600 hover:text-indigo-800 underline font-semibold">Treasure Data → AI Agent Foundry</a> per distribuire il tuo agente.',
        'step2.name': 'Nome del Progetto',
        'step2.description': 'Descrizione del Progetto',

        'step3.title': '🤖 Passo 3: Rivedi la Configurazione dell\'Agente',
        'step3.info': '<strong>✨ Generato da IA:</strong> TD Agent Foundry ha selezionato impostazioni ideali per il tuo agente. Personalizza se necessario.',
        'step3.name': 'Nome Visualizzato dell\'Agente',
        'step3.model': 'Modello IA',
        'step3.temperature': 'Temperatura:',
        'step3.temp.tip': 'Bassa = Più preciso e coerente | Alta = Più creativo e vario',
        'step3.prompt': 'Prompt di Sistema',
        'step3.prompt.tip': 'Prompt di sistema generato da IA in base alla tua descrizione',
        'button.regenerate': '🔄 Rigenera',

        'step4.title': '🚀 Passo 4: Scarica e Distribuisci',
        'step4.info': '<strong>✅ Configurazione Completata!</strong> Il tuo agente IA è pronto per essere distribuito. Scarica tutti i file e segui la guida di distribuzione.',
        'step4.summary': 'Riepilogo Configurazione',
        'step4.agent.name': 'Nome Agente:',
        'step4.project': 'Progetto:',
        'step4.model': 'Modello IA:',
        'step4.temperature': 'Temperatura:',
        'step4.kb': 'Basi di Conoscenza:',
        'step4.tools': 'Strumenti:',
        'button.viewoutput': '📄 Visualizza Pagina di Output Copiabile',
        'button.downloadkbs': '📚 Scarica File Basi di Conoscenza (.md)',
        'button.downloadproject': '📋 Scarica Guida Configurazione Progetto',
        'button.downloadagent': '🤖 Scarica Configurazione Agente',
        'button.downloadall': '⬇️ Scarica Tutti i File',
        'button.autodeploy': '🚀 Distribuzione Automatica su Agent Foundry',
        'deploy.steps': '📖 Prossimi Passi:',
        'deploy.step1': 'Scarica tutti i file sul tuo computer',
        'deploy.step2': 'Apri Agent Foundry',
        'deploy.step3': 'Crea un nuovo progetto (usa la guida PROJECT_SETUP.md)',
        'deploy.step4': 'Carica i file delle basi di conoscenza',
        'deploy.step5': 'Configura l\'agente (usa la guida AGENT_CONFIG.md)',
        'deploy.step6': 'Testa e distribuisci il tuo agente!',
        'deploy.comingsoon': 'Prossimamente',

        'button.previous': '← Precedente',
        'button.next': 'Successivo →',
        'step.of': 'Passo',
        'step.total': 'di 8',

        'error.required': '⚠️ Per favore, scrivi un messaggio prima di inviare',
        'validation.description.required': 'Per favore, descrivi prima il tuo agente! Aggiungi almeno una breve descrizione di cosa dovrebbe fare il tuo agente (minimo 20 caratteri).',
        'validation.description.detailed': 'Per favore, fornisci una descrizione dettagliata del tuo agente (almeno 50 caratteri).',
        'validation.kb.required': 'Per favore, crea almeno una base di conoscenza.',
        'validation.kb.minimum': 'Devi avere almeno una base di conoscenza!',
        'validation.kb.title.content': 'deve avere titolo e contenuto.',
        'validation.kb.limit': 'supera il limite di 18.000 caratteri.',
        'validation.project.name': 'Per favore, inserisci un nome di progetto.',
        'validation.project.description': 'Per favore, inserisci una descrizione del progetto.',
        'validation.agent.name': 'Per favore, inserisci un nome di agente.',
        'validation.agent.prompt': 'Per favore, fornisci un prompt di sistema.',
        'validation.ai.failed': 'Generazione IA fallita. Utilizzo generazione basata su parole chiave.',
        'validation.copy.failed': 'Copia fallita: ',

        // Placeholders and examples
        'chat.placeholder': 'Esempio: Voglio creare un agente di pianificazione campagne che aiuti i professionisti del marketing a creare campagne complete su più canali...',
        'example.text': 'Esempio: Voglio creare un agente di pianificazione campagne che aiuti i professionisti del marketing...',
        'audience.placeholder': 'Esempio: Dipendenti aziendali, clienti, membri interni del team...',
        'connected.status': '🟢 Connesso a TD LLM API! Utilizzo connessione locale sulla porta 3001. Tutte le risposte provengono da TD AI tramite la tua installazione di TD Agent Foundry.',
        'quick.examples': 'Esempi Rapidi:',
        'tip.text': '💡 Suggerimento: Più dettagli fornisci, meglio l\'IA può generare la configurazione del tuo agente. Includi esempi specifici di domande che gli utenti potrebbero fare o compiti per cui hanno bisogno di aiuto.',

        // Success messages
        'success.generated': 'Agente generato con successo!',
        'success.created': 'Ho creato:',
        'success.kb.count': 'basi di conoscenza',
        'success.project.config': 'Configurazione del progetto',
        'success.agent.settings': 'Impostazioni e prompt di sistema dell\'agente',
        'success.next.step': 'Fai clic su <strong>"Successivo →"</strong> per rivedere e personalizzare ogni componente!',

        // Sidebar messages
        'sidebar.step1.msg': '📚 Ottimo! Rivedi le tue basi di conoscenza. Saranno la base dell\'esperienza del tuo agente.',
        'sidebar.step2.msg': '🔧 Ora configuriamo il tuo progetto. Ho precompilato i dettagli in base alla tua descrizione.',
        'sidebar.step3.msg': '🤖 Quasi fatto! Rivedi le impostazioni dell\'agente. Ho ottimizzato il modello e la temperatura per il tuo caso d\'uso.',
        'sidebar.step4.msg': '🎉 Eccellente! Il tuo agente è pronto per essere distribuito. Scarica i file e segui la guida di distribuzione Agent Foundry.',
        'sidebar.generating': '✨ Sto chiedendo a TD AI di generare la configurazione del tuo agente...',
        'sidebar.connected': '🟢 Connesso a TD LLM API! Utilizzo connessione locale sulla porta 3001. Tutte le risposte provengono da TD AI tramite la tua installazione di TD Agent Foundry.',

        // Domain-specific sample data
        'domain.marketing.name': 'Centro di Pianificazione Campagne Marketing',
        'domain.marketing.desc': 'Uno stratega di campagne marketing che assiste con la pianificazione di campagne, creazione di contenuti, selezione di canali e ottimizzazione delle prestazioni. Aiuta a eseguire strategie di marketing efficaci.',
        'domain.marketing.agent': 'Stratega di Campagne Marketing',
        'domain.marketing.prompt': `Sei uno Stratega di Campagne Marketing esperto con una conoscenza completa della pianificazione di campagne, social media, content marketing e analytics.

Il tuo ruolo è:
- Aiutare a pianificare campagne di marketing efficaci
- Suggerire canali e tattiche appropriate
- Fornire le migliori pratiche per ogni canale di marketing
- Assistere con la strategia dei contenuti e la messaggistica
- Guidare la misurazione e l'ottimizzazione delle campagne

Linee guida:
- Iniziare con obiettivi chiari e pubblico target
- Raccomandare strategie basate sui dati
- Fornire idee creative rimanendo strategici
- Bilanciare tattiche a breve termine con costruzione del brand a lungo termine
- Rimanere aggiornati con tendenze e piattaforme di marketing
- Concentrarsi su risultati misurabili e ROI

Allineare sempre le raccomandazioni con gli obiettivi aziendali e le risorse disponibili.`,
        'domain.hr.name': 'Sistema di Supporto HR per Dipendenti',
        'domain.hr.desc': 'Un assistente HR completo che aiuta i dipendenti con le politiche aziendali, benefit, richieste di permesso e domande HR generali. Fornisce supporto preciso ed empatico basato sulla documentazione HR aziendale.',
        'domain.hr.agent': 'Assistente di Supporto HR',
        'domain.hr.prompt': `Sei un Consulente Risorse Umane esperto con una profonda conoscenza delle politiche HR, amministrazione benefit, leggi sul lavoro e migliori pratiche di gestione dei dipendenti.

Il tuo ruolo è:
- Fornire indicazioni precise sulle politiche aziendali
- Aiutare i dipendenti con domande sui benefit
- Guidare sulle procedure di permessi e assenze
- Assistere con questioni relative alla busta paga
- Chiarire processi e flussi di lavoro HR

Linee guida:
- Consultare sempre la documentazione ufficiale aziendale
- Mantenere riservatezza e professionalità
- Fornire indicazioni empatiche e utili
- Escalare questioni complesse o sensibili ai professionisti HR
- Rimanere neutrale e imparziale
- Seguire requisiti legali e normativi

Assicurarsi che tutte le informazioni siano accurate e aggiornate con le politiche aziendali.`,
        'domain.support.name': 'Piattaforma Assistente Supporto Clienti',
        'domain.support.desc': 'Un sistema di supporto clienti intelligente che aiuta i clienti con domande sui prodotti, risoluzione problemi e gestione account. Escalade problemi complessi ad agenti umani quando appropriato.',
        'domain.support.agent': 'Agente di Supporto Clienti',
        'domain.support.prompt': `Sei uno Specialista del Supporto Clienti esperto con vasta esperienza nella risoluzione di problemi dei prodotti, gestione account e soddisfazione del cliente.

Il tuo ruolo è:
- Fornire supporto clienti rapido e utile
- Risolvere problemi comuni dei prodotti
- Guidare i clienti attraverso configurazioni e processi
- Assistere con gestione account e fatturazione
- Escalare problemi complessi ad agenti umani quando appropriato

Linee guida:
- Essere pazienti, empatici e professionali
- Fornire istruzioni chiare passo-passo
- Verificare la comprensione prima di procedere
- Offrire soluzioni multiple quando possibile
- Documentare problemi comuni per miglioramenti futuri
- Concentrarsi sulla risoluzione problemi e soddisfazione del cliente

Dare sempre priorità all'esperienza del cliente e fornire soluzioni precise e utili.`,
        'domain.it.name': 'Supporto IT e Help Desk Tecnico',
        'domain.it.desc': 'Un assistente di supporto tecnico che guida i dipendenti attraverso la configurazione del sistema, installazione software, risoluzione problemi e migliori pratiche di sicurezza. Fornisce indicazioni tecniche precise passo-passo.',
        'domain.it.agent': 'Specialista di Supporto IT',
        'domain.it.prompt': `Sei uno Specialista di Supporto IT esperto con conoscenza estensiva di infrastruttura di sistema, applicazioni software, networking e cybersecurity.

Il tuo ruolo è:
- Fornire supporto tecnico per problemi hardware e software
- Guidare gli utenti attraverso installazione e configurazione software
- Risolvere problemi di rete e connettività
- Educare gli utenti sulle migliori pratiche di sicurezza
- Assistere con gestione account e permessi

Linee guida:
- Fornire istruzioni tecniche chiare passo-passo
- Adattare le spiegazioni al livello tecnico dell'utente
- Dare priorità a sicurezza e migliori pratiche
- Documentare soluzioni per problemi comuni
- Escalare problemi di sistema critici a team specializzati
- Rimanere aggiornati con aggiornamenti di sistema e patch di sicurezza

Assicurarsi che tutte le indicazioni seguano le politiche IT e gli standard di sicurezza aziendali.`,
        'domain.sales.name': 'Assistente Vendite e Helper CRM',
        'domain.sales.desc': 'Uno strumento di abilitazione vendite che aiuta i team di vendita con informazioni sui prodotti, prezzi, gestione obiezioni e tecniche di chiusura. Supporta l\'intero processo di vendita dalla scoperta alla chiusura.',
        'domain.sales.agent': 'Assistente Vendite',
        'domain.sales.prompt': `Sei un Consulente Vendite esperto con profonda conoscenza di metodologie di vendita, conoscenza prodotti, analisi competitiva e gestione relazioni clienti.

Il tuo ruolo è:
- Assistere con informazioni e posizionamento prodotti
- Fornire indicazioni su prezzi e sconti
- Aiutare a superare obiezioni di vendita comuni
- Suggerire tecniche e strategie di chiusura
- Supportare processi di qualificazione e scoperta lead

Linee guida:
- Concentrarsi sulla creazione di valore per il cliente
- Fornire informazioni precise sui prodotti
- Suggerire approcci consulenziali, non aggressivi
- Comprendere le esigenze del cliente prima di raccomandare soluzioni
- Rimanere aggiornati su concorrenti e tendenze di mercato
- Allineare strategie di vendita con obiettivi aziendali

Dare sempre priorità alle relazioni clienti a lungo termine rispetto alle vittorie a breve termine.`
    },

    german: {
        'page.title': 'KI-gestützter Agenten-Builder',
        'page.subtitle': 'Beschreiben Sie Ihren Agenten und ich helfe Ihnen, ihn Schritt für Schritt zu erstellen',
        'page.powered': 'Entwickelt von TD Agent Foundry • PM Agent Squad Master Vorlage',
        'api.settings': 'API-Einstellungen',

        'assistant.title': 'Agent Foundry Assistent',
        'assistant.subtitle': 'Ihr Assistent für die Agentenerstellung',
        'assistant.welcome': "👋 Hallo! Ich bin Ihr Agent Foundry Assistent. Ich helfe Ihnen, einen benutzerdefinierten AI Foundry Agenten zu erstellen.",
        'assistant.start': "<strong>Lassen Sie uns beginnen:</strong> Welche Art von Agent möchten Sie erstellen? Beschreiben Sie, was er tun soll.",
        'assistant.connected': '🟢 Mit TD LLM API verbunden!',
        'assistant.connection.detail': 'Verwendung lokaler Verbindung auf Port 3001. Alle Antworten kommen von TD AI über Ihre TD Agent Foundry Installation.',
        'button.ask': 'Assistent fragen',
        'button.stop': '⏹️ Antwort stoppen',
        'button.generate': '✨ Agent automatisch generieren',
        'button.cancel': '✖️ Generierung abbrechen',
        'button.reset': '🔄 Neu starten',
        'examples.title': 'Schnellbeispiele:',
        'example.campaign': '🎯 Kampagnenerstellung',
        'example.optimization': '📊 Kampagnenoptimierung',
        'example.reporting': '📈 Kampagnenberichte',

        'step.describe': 'Beschreiben',
        'step.knowledge': 'Wissen',
        'step.project': 'Projekt',
        'step.agent': 'Agent',
        'step.deploy': 'Bereitstellen',

        'step0.title': '🎯 Schritt 0: Beschreiben Sie Ihren Agenten',
        'step0.info': '<strong>KI-Erstellung:</strong> Sagen Sie TD Agent Foundry, was Ihr Agent tun soll, und er wird automatisch Wissensbasen, Konfiguration und Bereitstellungsdateien für Sie generieren.',
        'step0.purpose': 'Was ist der Zweck Ihres Agenten?',
        'step0.tone': 'Welchen Ton soll Ihr Agent haben?',
        'step0.audience': 'Wer wird diesen Agenten verwenden?',
        'step0.hint': 'Seien Sie spezifisch! Geben Sie an, was der Agent tun soll, wer ihn verwenden wird und welches Wissen er benötigt.',
        'step0.tip': '<strong>💡 Tipp:</strong> Je mehr Details Sie angeben, desto besser kann die KI die Konfiguration Ihres Agenten generieren. Fügen Sie spezifische Beispiele für Fragen hinzu, die Benutzer stellen könnten, oder Aufgaben, bei denen sie Hilfe benötigen.',

        'tone.professional': 'Professionell und Formell',
        'tone.friendly': 'Freundlich und Gesprächig',
        'tone.empathetic': 'Einfühlsam und Unterstützend',
        'tone.technical': 'Technisch und Präzise',
        'tone.enthusiastic': 'Enthusiastisch und Energiegeladen',

        'step1.title': '📚 Schritt 1: Wissensbasen überprüfen',
        'step1.info': '<strong>✨ KI-generiert:</strong> Basierend auf Ihrer Beschreibung hat TD Agent Foundry diese Wissensbasen für Ihren Agenten erstellt. Überprüfen und bearbeiten Sie sie bei Bedarf.',
        'step1.empty': 'Schließen Sie Schritt 0 ab, um Wissensbasen zu generieren',
        'step1.kb.title': 'Wissensbasis',
        'step1.kb.content': 'Inhalt',
        'step1.kb.characters': 'Zeichen',
        'button.addkb': '➕ Weitere Wissensbasis hinzufügen',
        'button.remove': 'Entfernen',
        'button.expand': 'Erweitern',

        'step2.title': '⚙️ Schritt 2: Projektkonfiguration überprüfen',
        'step2.info': '<strong>✨ KI-generiert:</strong> TD Agent Foundry hat Ihre Projekteinstellungen konfiguriert. Überprüfen und ändern Sie sie bei Bedarf.',
        'step2.next': '<strong>📍 Nächster Schritt:</strong> Nachdem Sie diesen Assistenten abgeschlossen haben, öffnen Sie <a href="https://console.treasuredata.com/app/agents" target="_blank" class="text-indigo-600 hover:text-indigo-800 underline font-semibold">Treasure Data → AI Agent Foundry</a>, um Ihren Agenten bereitzustellen.',
        'step2.name': 'Projektname',
        'step2.description': 'Projektbeschreibung',

        'step3.title': '🤖 Schritt 3: Agentenkonfiguration überprüfen',
        'step3.info': '<strong>✨ KI-generiert:</strong> TD Agent Foundry hat ideale Einstellungen für Ihren Agenten ausgewählt. Passen Sie sie bei Bedarf an.',
        'step3.name': 'Agenten-Anzeigename',
        'step3.model': 'KI-Modell',
        'step3.temperature': 'Temperatur:',
        'step3.temp.tip': 'Niedrig = Präziser und konsistenter | Hoch = Kreativer und variabler',
        'step3.prompt': 'System-Prompt',
        'step3.prompt.tip': 'KI-generierter System-Prompt basierend auf Ihrer Beschreibung',
        'button.regenerate': '🔄 Neu generieren',

        'step4.title': '🚀 Schritt 4: Herunterladen und Bereitstellen',
        'step4.info': '<strong>✅ Konfiguration abgeschlossen!</strong> Ihr KI-Agent ist bereit zur Bereitstellung. Laden Sie alle Dateien herunter und folgen Sie dem Bereitstellungsleitfaden.',
        'step4.summary': 'Konfigurationszusammenfassung',
        'step4.agent.name': 'Agenten-Name:',
        'step4.project': 'Projekt:',
        'step4.model': 'KI-Modell:',
        'step4.temperature': 'Temperatur:',
        'step4.kb': 'Wissensbasen:',
        'step4.tools': 'Werkzeuge:',
        'button.viewoutput': '📄 Kopierbare Ausgabeseite anzeigen',
        'button.downloadkbs': '📚 Wissensbasis-Dateien herunterladen (.md)',
        'button.downloadproject': '📋 Projekt-Setup-Leitfaden herunterladen',
        'button.downloadagent': '🤖 Agentenkonfiguration herunterladen',
        'button.downloadall': '⬇️ Alle Dateien herunterladen',
        'button.autodeploy': '🚀 Automatisch in Agent Foundry bereitstellen',
        'deploy.steps': '📖 Nächste Schritte:',
        'deploy.step1': 'Laden Sie alle Dateien auf Ihren Computer herunter',
        'deploy.step2': 'Öffnen Sie Agent Foundry',
        'deploy.step3': 'Erstellen Sie ein neues Projekt (verwenden Sie den PROJECT_SETUP.md Leitfaden)',
        'deploy.step4': 'Laden Sie die Wissensbasis-Dateien hoch',
        'deploy.step5': 'Konfigurieren Sie den Agenten (verwenden Sie den AGENT_CONFIG.md Leitfaden)',
        'deploy.step6': 'Testen und stellen Sie Ihren Agenten bereit!',
        'deploy.comingsoon': 'Demnächst',

        'button.previous': '← Zurück',
        'button.next': 'Weiter →',
        'step.of': 'Schritt',
        'step.total': 'von 8',

        'error.required': '⚠️ Bitte geben Sie eine Nachricht ein, bevor Sie senden',
        'validation.description.required': 'Bitte beschreiben Sie zuerst Ihren Agenten! Fügen Sie mindestens eine kurze Beschreibung hinzu, was Ihr Agent tun soll (mindestens 20 Zeichen).',
        'validation.description.detailed': 'Bitte geben Sie eine detaillierte Beschreibung Ihres Agenten an (mindestens 50 Zeichen).',
        'validation.kb.required': 'Bitte erstellen Sie mindestens eine Wissensbasis.',
        'validation.kb.minimum': 'Sie müssen mindestens eine Wissensbasis haben!',
        'validation.kb.title.content': 'muss Titel und Inhalt haben.',
        'validation.kb.limit': 'überschreitet das Limit von 18.000 Zeichen.',
        'validation.project.name': 'Bitte geben Sie einen Projektnamen ein.',
        'validation.project.description': 'Bitte geben Sie eine Projektbeschreibung ein.',
        'validation.agent.name': 'Bitte geben Sie einen Agentennamen ein.',
        'validation.agent.prompt': 'Bitte geben Sie einen System-Prompt an.',
        'validation.ai.failed': 'KI-Generierung fehlgeschlagen. Verwende schlüsselwortbasierte Generierung.',
        'validation.copy.failed': 'Kopieren fehlgeschlagen: ',

        // Placeholders and examples
        'chat.placeholder': 'Beispiel: Ich möchte einen Kampagnenplanungs-Agenten erstellen, der Marketingprofis dabei hilft, umfassende Kampagnen über mehrere Kanäle zu erstellen...',
        'example.text': 'Beispiel: Ich möchte einen Kampagnenplanungs-Agenten erstellen, der Marketingprofis hilft...',
        'audience.placeholder': 'Beispiel: Firmenmitarbeiter, Kunden, interne Teammitglieder...',
        'connected.status': '🟢 Mit TD LLM API verbunden! Verwendung lokaler Verbindung auf Port 3001. Alle Antworten kommen von TD AI über Ihre TD Agent Foundry Installation.',
        'quick.examples': 'Schnellbeispiele:',
        'tip.text': '💡 Tipp: Je mehr Details Sie angeben, desto besser kann die KI die Konfiguration Ihres Agenten generieren. Fügen Sie spezifische Beispiele für Fragen hinzu, die Benutzer stellen könnten, oder Aufgaben, bei denen sie Hilfe benötigen.',

        // Success messages
        'success.generated': 'Agent erfolgreich generiert!',
        'success.created': 'Ich habe erstellt:',
        'success.kb.count': 'Wissensbasen',
        'success.project.config': 'Projektkonfiguration',
        'success.agent.settings': 'Agenteneinstellungen und System-Prompt',
        'success.next.step': 'Klicken Sie auf <strong>"Weiter →"</strong>, um jede Komponente zu überprüfen und anzupassen!',

        // Sidebar messages
        'sidebar.step1.msg': '📚 Großartig! Überprüfen Sie Ihre Wissensbasen. Sie werden die Grundlage der Expertise Ihres Agenten sein.',
        'sidebar.step2.msg': '🔧 Jetzt konfigurieren wir Ihr Projekt. Ich habe die Details basierend auf Ihrer Beschreibung vorausgefüllt.',
        'sidebar.step3.msg': '🤖 Fast fertig! Überprüfen Sie die Agenteneinstellungen. Ich habe das Modell und die Temperatur für Ihren Anwendungsfall optimiert.',
        'sidebar.step4.msg': '🎉 Ausgezeichnet! Ihr Agent ist bereit zur Bereitstellung. Laden Sie die Dateien herunter und folgen Sie dem Agent Foundry Bereitstellungsleitfaden.',
        'sidebar.generating': '✨ Bitte TD AI, die Konfiguration Ihres Agenten zu generieren...',
        'sidebar.connected': '🟢 Mit TD LLM API verbunden! Verwendung lokaler Verbindung auf Port 3001. Alle Antworten kommen von TD AI über Ihre TD Agent Foundry Installation.',

        // Domain-specific sample data
        'domain.marketing.name': 'Marketing-Kampagnenplanungszentrum',
        'domain.marketing.desc': 'Ein Marketing-Kampagnenstratege, der bei Kampagnenplanung, Inhaltserstellung, Kanalauswahl und Leistungsoptimierung unterstützt. Hilft bei der Umsetzung effektiver Marketingstrategien.',
        'domain.marketing.agent': 'Marketing-Kampagnenstratege',
        'domain.marketing.prompt': `Sie sind ein erfahrener Marketing-Kampagnenstratege mit umfassendem Wissen über Kampagnenplanung, Social Media, Content-Marketing und Analytics.

Ihre Rolle ist es:
- Bei der Planung effektiver Marketingkampagnen zu helfen
- Geeignete Kanäle und Taktiken vorzuschlagen
- Best Practices für jeden Marketingkanal bereitzustellen
- Bei Content-Strategie und Messaging zu unterstützen
- Kampagnenmessung und -optimierung zu leiten

Richtlinien:
- Mit klaren Zielen und Zielgruppe beginnen
- Datengestützte Strategien empfehlen
- Kreative Ideen liefern und dabei strategisch bleiben
- Kurzfristige Taktiken mit langfristigem Markenaufbau ausbalancieren
- Mit Marketing-Trends und -Plattformen auf dem Laufenden bleiben
- Auf messbare Ergebnisse und ROI fokussieren

Empfehlungen immer an Geschäftszielen und verfügbaren Ressourcen ausrichten.`,
        'domain.hr.name': 'Mitarbeiter-HR-Supportsystem',
        'domain.hr.desc': 'Ein umfassender HR-Assistent, der Mitarbeitern bei Unternehmensrichtlinien, Sozialleistungen, Urlaubsanträgen und allgemeinen HR-Anfragen hilft. Bietet präzise und einfühlsame Unterstützung basierend auf der HR-Dokumentation des Unternehmens.',
        'domain.hr.agent': 'HR-Support-Assistent',
        'domain.hr.prompt': `Sie sind ein erfahrener Personalberater mit fundiertem Wissen über HR-Richtlinien, Sozialleistungsverwaltung, Arbeitsrecht und Best Practices im Mitarbeitermanagement.

Ihre Rolle ist es:
- Präzise Anleitung zu Unternehmensrichtlinien zu geben
- Mitarbeitern bei Fragen zu Sozialleistungen zu helfen
- Bei Urlaubs- und Abwesenheitsverfahren zu beraten
- Bei gehaltsrelevanten Angelegenheiten zu unterstützen
- HR-Prozesse und Arbeitsabläufe zu klären

Richtlinien:
- Immer offizielle Unternehmensdokumentation konsultieren
- Vertraulichkeit und Professionalität wahren
- Einfühlsame und hilfreiche Anleitung bieten
- Komplexe oder sensible Angelegenheiten an HR-Fachleute eskalieren
- Neutral und unparteiisch bleiben
- Gesetzliche und regulatorische Anforderungen befolgen

Sicherstellen, dass alle Informationen korrekt und mit den Unternehmensrichtlinien aktuell sind.`,
        'domain.support.name': 'Kundensupport-Assistentenplattform',
        'domain.support.desc': 'Ein intelligentes Kundensupport-System, das Kunden bei Produktfragen, Fehlerbehebung und Kontoverwaltung hilft. Eskaliert komplexe Probleme bei Bedarf an menschliche Agenten.',
        'domain.support.agent': 'Kundensupport-Agent',
        'domain.support.prompt': `Sie sind ein erfahrener Kundensupport-Spezialist mit umfassender Erfahrung in Produktfehlerbehebung, Kontoverwaltung und Kundenzufriedenheit.

Ihre Rolle ist es:
- Schnellen und hilfreichen Kundensupport zu bieten
- Häufige Produktprobleme zu beheben
- Kunden durch Einrichtungen und Prozesse zu führen
- Bei Kontoverwaltung und Abrechnung zu unterstützen
- Komplexe Probleme bei Bedarf an menschliche Agenten zu eskalieren

Richtlinien:
- Geduldig, einfühlsam und professionell sein
- Klare Schritt-für-Schritt-Anweisungen geben
- Verständnis überprüfen, bevor fortgefahren wird
- Mehrere Lösungen anbieten, wenn möglich
- Häufige Probleme für zukünftige Verbesserungen dokumentieren
- Auf Problemlösung und Kundenzufriedenheit fokussieren

Immer Kundenerfahrung priorisieren und präzise, hilfreiche Lösungen bieten.`,
        'domain.it.name': 'IT-Support und technischer Helpdesk',
        'domain.it.desc': 'Ein technischer Support-Assistent, der Mitarbeiter durch Systemeinrichtung, Softwareinstallation, Fehlerbehebung und Sicherheits-Best-Practices führt. Bietet präzise technische Schritt-für-Schritt-Anleitung.',
        'domain.it.agent': 'IT-Support-Spezialist',
        'domain.it.prompt': `Sie sind ein erfahrener IT-Support-Spezialist mit umfassendem Wissen über Systeminfrastruktur, Softwareanwendungen, Netzwerke und Cybersicherheit.

Ihre Rolle ist es:
- Technischen Support für Hardware- und Softwareprobleme zu bieten
- Benutzer durch Softwareinstallation und -konfiguration zu führen
- Netzwerk- und Verbindungsprobleme zu beheben
- Benutzer über Sicherheits-Best-Practices aufzuklären
- Bei Kontoverwaltung und Berechtigungen zu unterstützen

Richtlinien:
- Klare technische Schritt-für-Schritt-Anweisungen geben
- Erklärungen an das technische Niveau des Benutzers anpassen
- Sicherheit und Best Practices priorisieren
- Lösungen für häufige Probleme dokumentieren
- Kritische Systemprobleme an spezialisierte Teams eskalieren
- Mit Systemaktualisierungen und Sicherheitspatches auf dem Laufenden bleiben

Sicherstellen, dass alle Anleitungen den IT-Richtlinien und Sicherheitsstandards des Unternehmens entsprechen.`,
        'domain.sales.name': 'Vertriebsassistent und CRM-Helfer',
        'domain.sales.desc': 'Ein Vertriebsunterstützungstool, das Vertriebsteams bei Produktinformationen, Preisgestaltung, Einwandbehandlung und Abschlusstechniken hilft. Unterstützt den gesamten Verkaufsprozess von der Erkennung bis zum Abschluss.',
        'domain.sales.agent': 'Vertriebsassistent',
        'domain.sales.prompt': `Sie sind ein erfahrener Vertriebsberater mit fundiertem Wissen über Vertriebsmethoden, Produktkenntnisse, Wettbewerbsanalyse und Kundenbeziehungsmanagement.

Ihre Rolle ist es:
- Bei Produktinformationen und Positionierung zu unterstützen
- Anleitung zu Preisen und Rabatten zu geben
- Bei der Überwindung häufiger Vertriebseinwände zu helfen
- Abschlusstechniken und -strategien vorzuschlagen
- Lead-Qualifizierungs- und Erkennungsprozesse zu unterstützen

Richtlinien:
- Auf Kundenwertschöpfung fokussieren
- Präzise Produktinformationen liefern
- Beratende, nicht aggressive Ansätze vorschlagen
- Kundenbedürfnisse verstehen, bevor Lösungen empfohlen werden
- Über Wettbewerber und Markttrends auf dem Laufenden bleiben
- Vertriebsstrategien an Geschäftszielen ausrichten

Immer langfristige Kundenbeziehungen über kurzfristige Erfolge priorisieren.`
    },

    korean: {
        'page.title': 'AI 기반 에이전트 빌더',
        'page.subtitle': '에이전트를 설명하면 단계별로 구축을 도와드립니다',
        'page.powered': 'TD Agent Foundry 제공 • PM Agent Squad Master 템플릿',
        'api.settings': 'API 설정',

        'assistant.title': 'Agent Foundry 어시스턴트',
        'assistant.subtitle': '에이전트 생성 어시스턴트',
        'assistant.welcome': "👋 안녕하세요! Agent Foundry 어시스턴트입니다. 맞춤형 AI Foundry 에이전트 구축을 도와드리겠습니다.",
        'assistant.start': "<strong>시작하겠습니다:</strong> 어떤 유형의 에이전트를 만들고 싶으신가요? 무엇을 해야 하는지 설명해주세요.",
        'assistant.connected': '🟢 TD LLM API에 연결되었습니다!',
        'assistant.connection.detail': '포트 3001에서 로컬 연결을 사용합니다. 모든 응답은 TD Agent Foundry 설치를 통해 TD AI에서 제공됩니다.',
        'button.ask': '어시스턴트에게 질문',
        'button.stop': '⏹️ 응답 중지',
        'button.generate': '✨ 에이전트 자동 생성',
        'button.cancel': '✖️ 생성 취소',
        'button.reset': '🔄 다시 시작',
        'examples.title': '빠른 예제:',
        'example.campaign': '🎯 캠페인 구축',
        'example.optimization': '📊 캠페인 최적화',
        'example.reporting': '📈 캠페인 보고서',

        'step.describe': '설명',
        'step.knowledge': '지식',
        'step.project': '프로젝트',
        'step.agent': '에이전트',
        'step.deploy': '배포',

        'step0.title': '🎯 단계 0: 에이전트 설명',
        'step0.info': '<strong>AI 구축:</strong> TD Agent Foundry에게 에이전트가 해야 할 일을 알려주면 자동으로 지식 베이스, 구성 및 배포 파일을 생성합니다.',
        'step0.purpose': '에이전트의 목적은 무엇인가요?',
        'step0.tone': '에이전트는 어떤 톤을 가져야 하나요?',
        'step0.audience': '누가 이 에이전트를 사용하나요?',
        'step0.hint': '구체적으로 작성하세요! 에이전트가 무엇을 해야 하는지, 누가 사용할지, 어떤 지식이 필요한지 포함하세요.',
        'step0.tip': '<strong>💡 팁:</strong> 더 많은 세부 정보를 제공할수록 AI가 에이전트 구성을 더 잘 생성할 수 있습니다. 사용자가 할 수 있는 구체적인 질문 예시나 도움이 필요한 작업을 포함하세요.',

        'tone.professional': '전문적이고 격식 있는',
        'tone.friendly': '친근하고 대화적인',
        'tone.empathetic': '공감적이고 지원적인',
        'tone.technical': '기술적이고 정확한',
        'tone.enthusiastic': '열정적이고 활기찬',

        'step1.title': '📚 단계 1: 지식 베이스 검토',
        'step1.info': '<strong>✨ AI 생성:</strong> 설명을 기반으로 AI가 에이전트를 위한 지식 베이스를 생성했습니다. 필요에 따라 검토하고 편집하세요.',
        'step1.empty': '지식 베이스를 생성하려면 단계 0을 완료하세요',
        'step1.kb.title': '지식 베이스',
        'step1.kb.content': '내용',
        'step1.kb.characters': '문자',
        'button.addkb': '➕ 다른 지식 베이스 추가',
        'button.remove': '제거',
        'button.expand': '확장',

        'step2.title': '⚙️ 단계 2: 프로젝트 구성 검토',
        'step2.info': '<strong>✨ AI 생성:</strong> AI가 프로젝트 설정을 구성했습니다. 필요에 따라 검토하고 수정하세요.',
        'step2.next': '<strong>📍 다음 단계:</strong> 이 마법사를 완료한 후 <a href="https://console.treasuredata.com/app/agents" target="_blank" class="text-indigo-600 hover:text-indigo-800 underline font-semibold">Treasure Data → AI Agent Foundry</a>를 열어 에이전트를 배포하세요.',
        'step2.name': '프로젝트 이름',
        'step2.description': '프로젝트 설명',

        'step3.title': '🤖 단계 3: 에이전트 구성 검토',
        'step3.info': '<strong>✨ AI 생성:</strong> AI가 에이전트에 대한 이상적인 설정을 선택했습니다. 필요에 따라 사용자 지정하세요.',
        'step3.name': '에이전트 표시 이름',
        'step3.model': 'AI 모델',
        'step3.temperature': '온도:',
        'step3.temp.tip': '낮음 = 더 정확하고 일관적 | 높음 = 더 창의적이고 다양함',
        'step3.prompt': '시스템 프롬프트',
        'step3.prompt.tip': '설명을 기반으로 AI가 생성한 시스템 프롬프트',
        'button.regenerate': '🔄 재생성',

        'step4.title': '🚀 단계 4: 다운로드 및 배포',
        'step4.info': '<strong>✅ 구성 완료!</strong> AI 에이전트가 배포 준비되었습니다. 모든 파일을 다운로드하고 배포 가이드를 따르세요.',
        'step4.summary': '구성 요약',
        'step4.agent.name': '에이전트 이름:',
        'step4.project': '프로젝트:',
        'step4.model': 'AI 모델:',
        'step4.temperature': '온도:',
        'step4.kb': '지식 베이스:',
        'step4.tools': '도구:',
        'button.viewoutput': '📄 복사 가능한 출력 페이지 보기',
        'button.downloadkbs': '📚 지식 베이스 파일 다운로드 (.md)',
        'button.downloadproject': '📋 프로젝트 설정 가이드 다운로드',
        'button.downloadagent': '🤖 에이전트 구성 다운로드',
        'button.downloadall': '⬇️ 모든 파일 다운로드',
        'button.autodeploy': '🚀 Agent Foundry에 자동 배포',
        'deploy.steps': '📖 다음 단계:',
        'deploy.step1': '모든 파일을 컴퓨터에 다운로드',
        'deploy.step2': 'Agent Foundry 열기',
        'deploy.step3': '새 프로젝트 생성 (PROJECT_SETUP.md 가이드 사용)',
        'deploy.step4': '지식 베이스 파일 업로드',
        'deploy.step5': '에이전트 구성 (AGENT_CONFIG.md 가이드 사용)',
        'deploy.step6': '에이전트 테스트 및 배포!',
        'deploy.comingsoon': '곧 출시',

        'button.previous': '← 이전',
        'button.next': '다음 →',
        'step.of': '단계',
        'step.total': '/ 8',

        'error.required': '⚠️ 전송하기 전에 메시지를 입력하세요',
        'validation.description.required': '먼저 에이전트를 설명하세요! 에이전트가 해야 할 일에 대한 간단한 설명을 추가하세요 (최소 20자).',
        'validation.description.detailed': '에이전트에 대한 자세한 설명을 제공하세요 (최소 50자).',
        'validation.kb.required': '최소 하나의 지식 베이스를 생성하세요.',
        'validation.kb.minimum': '최소 하나의 지식 베이스가 있어야 합니다!',
        'validation.kb.title.content': '제목과 내용이 있어야 합니다.',
        'validation.kb.limit': '18,000자 제한을 초과합니다.',
        'validation.project.name': '프로젝트 이름을 입력하세요.',
        'validation.project.description': '프로젝트 설명을 입력하세요.',
        'validation.agent.name': '에이전트 이름을 입력하세요.',
        'validation.agent.prompt': '시스템 프롬프트를 제공하세요.',
        'validation.ai.failed': 'AI 생성 실패. 키워드 기반 생성 사용.',
        'validation.copy.failed': '복사 실패: ',

        // Placeholders and examples
        'chat.placeholder': '예: 마케팅 전문가가 여러 채널에서 포괄적인 캠페인을 만드는 데 도움이 되는 캠페인 계획 에이전트를 만들고 싶습니다...',
        'example.text': '예: 마케팅 전문가를 돕는 캠페인 계획 에이전트를 만들고 싶습니다...',
        'audience.placeholder': '예: 회사 직원, 고객, 내부 팀원...',
        'connected.status': '🟢 TD LLM API에 연결되었습니다! 포트 3001에서 로컬 연결을 사용합니다. 모든 응답은 TD Agent Foundry 설치를 통해 TD AI에서 제공됩니다.',
        'quick.examples': '빠른 예제:',
        'tip.text': '💡 팁: 더 많은 세부 정보를 제공할수록 AI가 에이전트 구성을 더 잘 생성할 수 있습니다. 사용자가 할 수 있는 구체적인 질문 예시나 도움이 필요한 작업을 포함하세요.',

        // Success messages
        'success.generated': '에이전트가 성공적으로 생성되었습니다!',
        'success.created': '생성됨:',
        'success.kb.count': '지식 베이스',
        'success.project.config': '프로젝트 구성',
        'success.agent.settings': '에이전트 설정 및 시스템 프롬프트',
        'success.next.step': '<strong>"다음 →"</strong>을 클릭하여 각 구성 요소를 검토하고 사용자 지정하세요!',

        // Sidebar messages
        'sidebar.step1.msg': '📚 훌륭합니다! 지식 베이스를 검토하세요. 에이전트 전문 지식의 기반이 될 것입니다.',
        'sidebar.step2.msg': '🔧 이제 프로젝트를 구성하겠습니다. 설명을 기반으로 세부 정보를 미리 채웠습니다.',
        'sidebar.step3.msg': '🤖 거의 완료되었습니다! 에이전트 설정을 검토하세요. 사용 사례에 맞게 모델과 온도를 최적화했습니다.',
        'sidebar.step4.msg': '🎉 훌륭합니다! 에이전트가 배포 준비되었습니다. 파일을 다운로드하고 Agent Foundry 배포 가이드를 따르세요.',
        'sidebar.generating': '✨ TD AI에게 에이전트 구성 생성을 요청하는 중...',
        'sidebar.connected': '🟢 TD LLM API에 연결되었습니다! 포트 3001에서 로컬 연결을 사용합니다. 모든 응답은 TD Agent Foundry 설치를 통해 TD AI에서 제공됩니다.',

        // Domain-specific sample data
        'domain.marketing.name': '마케팅 캠페인 계획 허브',
        'domain.marketing.desc': '캠페인 계획, 콘텐츠 생성, 채널 선택 및 성능 최적화를 지원하는 마케팅 캠페인 전략가. 효과적인 마케팅 전략 실행을 돕습니다.',
        'domain.marketing.agent': '마케팅 캠페인 전략가',
        'domain.marketing.prompt': `귀하는 캠페인 계획, 소셜 미디어, 콘텐츠 마케팅 및 분석에 대한 포괄적인 지식을 갖춘 전문 마케팅 캠페인 전략가입니다.

귀하의 역할:
- 효과적인 마케팅 캠페인 계획 지원
- 적절한 채널 및 전술 제안
- 각 마케팅 채널에 대한 모범 사례 제공
- 콘텐츠 전략 및 메시징 지원
- 캠페인 측정 및 최적화 안내

지침:
- 명확한 목표와 타겟 고객으로 시작
- 데이터 기반 전략 권장
- 전략적이면서 창의적인 아이디어 제공
- 단기 전술과 장기 브랜드 구축의 균형 유지
- 마케팅 트렌드 및 플랫폼에 대한 최신 정보 유지
- 측정 가능한 결과 및 ROI에 집중

항상 비즈니스 목표 및 사용 가능한 리소스에 맞춰 권장 사항을 조정하세요.`,
        'domain.hr.name': '직원 HR 지원 시스템',
        'domain.hr.desc': '회사 정책, 복리후생, 휴가 요청 및 일반 HR 문의를 직원에게 도와주는 포괄적인 HR 어시스턴트. 회사 HR 문서를 기반으로 정확하고 공감적인 지원을 제공합니다.',
        'domain.hr.agent': 'HR 지원 어시스턴트',
        'domain.hr.prompt': `귀하는 HR 정책, 복리후생 관리, 노동법 및 직원 관리 모범 사례에 대한 깊은 지식을 갖춘 전문 인사 컨설턴트입니다.

귀하의 역할:
- 회사 정책에 대한 정확한 안내 제공
- 복리후생 질문에 대한 직원 지원
- 휴가 및 결근 절차 안내
- 급여 관련 문제 지원
- HR 프로세스 및 워크플로 명확화

지침:
- 항상 공식 회사 문서 참조
- 기밀성 및 전문성 유지
- 공감적이고 도움이 되는 안내 제공
- 복잡하거나 민감한 문제는 HR 전문가에게 에스컬레이션
- 중립성과 공정성 유지
- 법적 및 규제 요구 사항 준수

모든 정보가 정확하고 회사 정책과 최신 상태인지 확인하세요.`,
        'domain.support.name': '고객 지원 어시스턴트 플랫폼',
        'domain.support.desc': '제품 질문, 문제 해결 및 계정 관리를 고객에게 도와주는 지능형 고객 지원 시스템. 적절한 경우 복잡한 문제를 인간 에이전트에게 에스컬레이션합니다.',
        'domain.support.agent': '고객 지원 에이전트',
        'domain.support.prompt': `귀하는 제품 문제 해결, 계정 관리 및 고객 만족에 대한 광범위한 경험을 갖춘 전문 고객 지원 전문가입니다.

귀하의 역할:
- 신속하고 유용한 고객 지원 제공
- 일반적인 제품 문제 해결
- 설정 및 프로세스를 통해 고객 안내
- 계정 관리 및 청구 지원
- 적절한 경우 복잡한 문제를 인간 에이전트에게 에스컬레이션

지침:
- 인내심 있고 공감적이며 전문적으로 대응
- 명확한 단계별 지침 제공
- 진행하기 전에 이해도 확인
- 가능한 경우 여러 솔루션 제공
- 향후 개선을 위해 일반적인 문제 문서화
- 문제 해결 및 고객 만족에 집중

항상 고객 경험을 우선시하고 정확하고 유용한 솔루션을 제공하세요.`,
        'domain.it.name': 'IT 지원 및 기술 헬프데스크',
        'domain.it.desc': '시스템 설정, 소프트웨어 설치, 문제 해결 및 보안 모범 사례를 통해 직원을 안내하는 기술 지원 어시스턴트. 정확한 기술 단계별 안내를 제공합니다.',
        'domain.it.agent': 'IT 지원 전문가',
        'domain.it.prompt': `귀하는 시스템 인프라, 소프트웨어 애플리케이션, 네트워킹 및 사이버 보안에 대한 광범위한 지식을 갖춘 전문 IT 지원 전문가입니다.

귀하의 역할:
- 하드웨어 및 소프트웨어 문제에 대한 기술 지원 제공
- 소프트웨어 설치 및 구성을 통해 사용자 안내
- 네트워크 및 연결 문제 해결
- 보안 모범 사례에 대해 사용자 교육
- 계정 관리 및 권한 지원

지침:
- 명확한 기술 단계별 지침 제공
- 사용자의 기술 수준에 맞게 설명 조정
- 보안 및 모범 사례 우선순위 지정
- 일반적인 문제에 대한 솔루션 문서화
- 중요한 시스템 문제는 전문 팀에게 에스컬레이션
- 시스템 업데이트 및 보안 패치에 대한 최신 정보 유지

모든 안내가 회사 IT 정책 및 보안 표준을 따르는지 확인하세요.`,
        'domain.sales.name': '영업 어시스턴트 및 CRM 헬퍼',
        'domain.sales.desc': '제품 정보, 가격 책정, 이의 처리 및 마감 기법을 영업 팀에게 도와주는 영업 지원 도구. 발견에서 마감까지 전체 영업 프로세스를 지원합니다.',
        'domain.sales.agent': '영업 어시스턴트',
        'domain.sales.prompt': `귀하는 영업 방법론, 제품 지식, 경쟁 분석 및 고객 관계 관리에 대한 깊은 지식을 갖춘 전문 영업 컨설턴트입니다.

귀하의 역할:
- 제품 정보 및 포지셔닝 지원
- 가격 및 할인에 대한 안내 제공
- 일반적인 영업 이의 극복 지원
- 마감 기법 및 전략 제안
- 리드 자격 및 발견 프로세스 지원

지침:
- 고객 가치 창출에 집중
- 정확한 제품 정보 제공
- 공격적이지 않은 컨설팅 접근 방식 제안
- 솔루션을 권장하기 전에 고객 요구 사항 이해
- 경쟁업체 및 시장 동향에 대한 최신 정보 유지
- 영업 전략을 비즈니스 목표에 맞춤

항상 단기 성과보다 장기 고객 관계를 우선시하세요.`
    },

    dutch: {
        'page.title': 'AI-aangedreven Agent Builder',
        'page.subtitle': 'Beschrijf je agent en ik help je stap voor stap bij het bouwen',
        'page.powered': 'Aangedreven door TD Agent Foundry • PM Agent Squad Master Sjabloon',
        'api.settings': 'API-instellingen',

        'assistant.title': 'Agent Foundry Assistent',
        'assistant.subtitle': 'Jouw assistent voor het maken van agents',
        'assistant.welcome': "👋 Hallo! Ik ben je Agent Foundry Assistent. Ik help je een aangepaste AI Foundry Agent te maken.",
        'assistant.start': "<strong>Laten we beginnen:</strong> Wat voor soort agent wil je maken? Beschrijf wat het moet doen.",
        'assistant.connected': '🟢 Verbonden met TD LLM API!',
        'assistant.connection.detail': 'Gebruik van lokale verbinding op poort 3001. Alle antwoorden komen van TD AI via je TD Agent Foundry installatie.',
        'button.ask': 'Vraag de Assistent',
        'button.stop': '⏹️ Stop Antwoord',
        'button.generate': '✨ Genereer Agent Automatisch',
        'button.cancel': '✖️ Annuleer Generatie',
        'button.reset': '🔄 Opnieuw Beginnen',
        'examples.title': 'Snelle Voorbeelden:',
        'example.campaign': '🎯 Campagne Opbouw',
        'example.optimization': '📊 Campagne Optimalisatie',
        'example.reporting': '📈 Campagne Rapportage',

        'step.describe': 'Beschrijven',
        'step.knowledge': 'Kennis',
        'step.project': 'Project',
        'step.agent': 'Agent',
        'step.deploy': 'Implementeren',

        'step0.title': '🎯 Stap 0: Beschrijf Je Agent',
        'step0.info': '<strong>AI Constructie:</strong> Vertel TD Agent Foundry wat je agent moet doen en het genereert automatisch kennisbanken, configuratie en implementatiebestanden voor je.',
        'step0.purpose': 'Wat is het doel van je agent?',
        'step0.tone': 'Welke toon moet je agent hebben?',
        'step0.audience': 'Wie zal deze agent gebruiken?',
        'step0.hint': 'Wees specifiek! Voeg toe wat de agent moet doen, wie het zal gebruiken en welke kennis het nodig heeft.',
        'step0.tip': '<strong>💡 Tip:</strong> Hoe meer details je geeft, hoe beter de AI de configuratie van je agent kan genereren. Voeg specifieke voorbeelden toe van vragen die gebruikers kunnen stellen of taken waarmee ze hulp nodig hebben.',

        'tone.professional': 'Professioneel en Formeel',
        'tone.friendly': 'Vriendelijk en Conversationeel',
        'tone.empathetic': 'Empathisch en Ondersteunend',
        'tone.technical': 'Technisch en Nauwkeurig',
        'tone.enthusiastic': 'Enthousiast en Energiek',

        'step1.title': '📚 Stap 1: Kennisbanken Beoordelen',
        'step1.info': '<strong>✨ AI-gegenereerd:</strong> Op basis van je beschrijving heeft TD Agent Foundry deze kennisbanken voor je agent gemaakt. Bekijk en bewerk indien nodig.',
        'step1.empty': 'Voltooi Stap 0 om kennisbanken te genereren',
        'step1.kb.title': 'Kennisbank',
        'step1.kb.content': 'Inhoud',
        'step1.kb.characters': 'tekens',
        'button.addkb': '➕ Voeg Andere Kennisbank Toe',
        'button.remove': 'Verwijder',
        'button.expand': 'Uitklappen',

        'step2.title': '⚙️ Stap 2: Projectconfiguratie Beoordelen',
        'step2.info': '<strong>✨ AI-gegenereerd:</strong> TD Agent Foundry heeft je projectinstellingen geconfigureerd. Bekijk en wijzig indien nodig.',
        'step2.next': '<strong>📍 Volgende Stap:</strong> Na het voltooien van deze wizard, open <a href="https://console.treasuredata.com/app/agents" target="_blank" class="text-indigo-600 hover:text-indigo-800 underline font-semibold">Treasure Data → AI Agent Foundry</a> om je agent te implementeren.',
        'step2.name': 'Projectnaam',
        'step2.description': 'Projectbeschrijving',

        'step3.title': '🤖 Stap 3: Agent Configuratie Beoordelen',
        'step3.info': '<strong>✨ AI-gegenereerd:</strong> TD Agent Foundry heeft ideale instellingen voor je agent geselecteerd. Pas aan indien nodig.',
        'step3.name': 'Agent Weergavenaam',
        'step3.model': 'AI-model',
        'step3.temperature': 'Temperatuur:',
        'step3.temp.tip': 'Lager = Nauwkeuriger en consistenter | Hoger = Creatiever en gevarieerder',
        'step3.prompt': 'Systeemprompt',
        'step3.prompt.tip': 'AI-gegenereerde systeemprompt op basis van je beschrijving',
        'button.regenerate': '🔄 Opnieuw Genereren',

        'step4.title': '🚀 Stap 4: Downloaden & Implementeren',
        'step4.info': '<strong>✅ Configuratie Voltooid!</strong> Je AI-agent is klaar om te implementeren. Download alle bestanden en volg de implementatiegids.',
        'step4.summary': 'Configuratie Samenvatting',
        'step4.agent.name': 'Agent Naam:',
        'step4.project': 'Project:',
        'step4.model': 'AI-model:',
        'step4.temperature': 'Temperatuur:',
        'step4.kb': 'Kennisbanken:',
        'step4.tools': 'Tools:',
        'button.viewoutput': '📄 Bekijk Kopieerbare Uitvoerpagina',
        'button.downloadkbs': '📚 Download Kennisbank Bestanden (.md)',
        'button.downloadproject': '📋 Download Project Setup Gids',
        'button.downloadagent': '🤖 Download Agent Configuratie',
        'button.downloadall': '⬇️ Download Alle Bestanden',
        'button.autodeploy': '🚀 Auto-Implementeer naar Agent Foundry',
        'deploy.steps': '📖 Volgende Stappen:',
        'deploy.step1': 'Download alle bestanden naar je computer',
        'deploy.step2': 'Open Agent Foundry',
        'deploy.step3': 'Maak een nieuw project (gebruik PROJECT_SETUP.md gids)',
        'deploy.step4': 'Upload de kennisbank bestanden',
        'deploy.step5': 'Configureer de agent (gebruik AGENT_CONFIG.md gids)',
        'deploy.step6': 'Test en implementeer je agent!',
        'deploy.comingsoon': 'Binnenkort Beschikbaar',

        'button.previous': '← Vorige',
        'button.next': 'Volgende →',
        'step.of': 'Stap',
        'step.total': 'van 8',

        'error.required': '⚠️ Voer een bericht in voordat je verzendt',
        'validation.description.required': 'Beschrijf eerst je agent! Voeg minimaal een korte beschrijving toe van wat je agent moet doen (minimaal 20 tekens).',
        'validation.description.detailed': 'Geef een gedetailleerde beschrijving van je agent (minimaal 50 tekens).',
        'validation.kb.required': 'Maak minimaal één kennisbank aan.',
        'validation.kb.minimum': 'Je moet minimaal één kennisbank hebben!',
        'validation.kb.title.content': 'moet titel en inhoud hebben.',
        'validation.kb.limit': 'overschrijdt de limiet van 18.000 tekens.',
        'validation.project.name': 'Voer een projectnaam in.',
        'validation.project.description': 'Voer een projectbeschrijving in.',
        'validation.agent.name': 'Voer een agent naam in.',
        'validation.agent.prompt': 'Geef een systeemprompt op.',
        'validation.ai.failed': 'AI-generatie mislukt. Gebruik maken van op trefwoorden gebaseerde generatie.',
        'validation.copy.failed': 'Kopiëren mislukt: ',

        // Placeholders and examples
        'chat.placeholder': 'Voorbeeld: Ik wil een campagne planning agent maken die marketingprofessionals helpt bij het creëren van uitgebreide campagnes over meerdere kanalen...',
        'example.text': 'Voorbeeld: Ik wil een campagne planning agent maken die marketingprofessionals helpt...',
        'audience.placeholder': 'Voorbeeld: Bedrijfsmedewerkers, klanten, interne teamleden...',
        'connected.status': '🟢 Verbonden met TD LLM API! Gebruik van lokale verbinding op poort 3001. Alle antwoorden komen van TD AI via je TD Agent Foundry installatie.',
        'quick.examples': 'Snelle Voorbeelden:',
        'tip.text': '💡 Tip: Hoe meer details je geeft, hoe beter de AI de configuratie van je agent kan genereren. Voeg specifieke voorbeelden toe van vragen die gebruikers kunnen stellen of taken waarmee ze hulp nodig hebben.',

        // Success messages
        'success.generated': 'Agent succesvol gegenereerd!',
        'success.created': 'Ik heb gemaakt:',
        'success.kb.count': 'kennisbanken',
        'success.project.config': 'Projectconfiguratie',
        'success.agent.settings': 'Agent instellingen en systeemprompt',
        'success.next.step': 'Klik op <strong>"Volgende →"</strong> om elk onderdeel te bekijken en aan te passen!',

        // Sidebar messages
        'sidebar.step1.msg': '📚 Geweldig! Bekijk je kennisbanken. Ze zullen de basis vormen van de expertise van je agent.',
        'sidebar.step2.msg': '🔧 Laten we nu je project configureren. Ik heb de details vooraf ingevuld op basis van je beschrijving.',
        'sidebar.step3.msg': '🤖 Bijna klaar! Bekijk de agent instellingen. Ik heb het model en de temperatuur geoptimaliseerd voor jouw use case.',
        'sidebar.step4.msg': '🎉 Uitstekend! Je agent is klaar om te implementeren. Download de bestanden en volg de Agent Foundry implementatiegids.',
        'sidebar.generating': '✨ Vraag TD AI om de configuratie van je agent te genereren...',
        'sidebar.connected': '🟢 Verbonden met TD LLM API! Gebruik van lokale verbinding op poort 3001. Alle antwoorden komen van TD AI via je TD Agent Foundry installatie.',

        // Domain-specific sample data
        'domain.marketing.name': 'Marketing Campagne Planning Hub',
        'domain.marketing.desc': 'Een marketingcampagne strateeg die helpt met campagneplanning, contentcreatie, kanaalselectie en prestatie-optimalisatie. Helpt bij het uitvoeren van effectieve marketingstrategieën.',
        'domain.marketing.agent': 'Marketing Campagne Strateeg',
        'domain.marketing.prompt': `Je bent een ervaren Marketing Campagne Strateeg met uitgebreide kennis van campagneplanning, sociale media, contentmarketing en analytics.

Je rol is om:
- Te helpen bij het plannen van effectieve marketingcampagnes
- Geschikte kanalen en tactieken voor te stellen
- Best practices te bieden voor elk marketingkanaal
- Te assisteren met contentstrategie en messaging
- Campagnemeting en -optimalisatie te begeleiden

Richtlijnen:
- Begin met duidelijke doelen en doelgroep
- Beveel datagestuurde strategieën aan
- Lever creatieve ideeën terwijl je strategisch blijft
- Balanceer kortetermijntactieken met langetermijnmerkopbouw
- Blijf up-to-date met marketingtrends en -platforms
- Focus op meetbare resultaten en ROI

Stem aanbevelingen altijd af op bedrijfsdoelen en beschikbare middelen.`,
        'domain.hr.name': 'Medewerker HR Ondersteuningssysteem',
        'domain.hr.desc': 'Een uitgebreide HR-assistent die medewerkers helpt met bedrijfsbeleid, secundaire arbeidsvoorwaarden, verlofaanvragen en algemene HR-vragen. Biedt nauwkeurige en empathische ondersteuning op basis van bedrijfs-HR-documentatie.',
        'domain.hr.agent': 'HR Ondersteuningsassistent',
        'domain.hr.prompt': `Je bent een ervaren HR-consultant met diepgaande kennis van HR-beleid, secundaire arbeidsvoorwaardenbeheer, arbeidswetgeving en best practices voor medewerkerbeheer.

Je rol is om:
- Nauwkeurige begeleiding te bieden over bedrijfsbeleid
- Medewerkers te helpen met vragen over secundaire arbeidsvoorwaarden
- Te begeleiden bij verlof- en afwezigheidsprocedures
- Te assisteren bij salarisgerelateerde zaken
- HR-processen en workflows te verduidelijken

Richtlijnen:
- Raadpleeg altijd officiële bedrijfsdocumentatie
- Handhaaf vertrouwelijkheid en professionaliteit
- Bied empathische en behulpzame begeleiding
- Escaleer complexe of gevoelige zaken naar HR-professionals
- Blijf neutraal en onpartijdig
- Volg wettelijke en regelgevende vereisten

Zorg ervoor dat alle informatie nauwkeurig en up-to-date is met bedrijfsbeleid.`,
        'domain.support.name': 'Klantenondersteuning Assistent Platform',
        'domain.support.desc': 'Een intelligent klantenondersteuningssysteem dat klanten helpt met productvragen, probleemoplossing en accountbeheer. Escaleert complexe problemen naar menselijke agenten wanneer gepast.',
        'domain.support.agent': 'Klantenondersteuning Agent',
        'domain.support.prompt': `Je bent een ervaren Klantenondersteuning Specialist met uitgebreide ervaring in het oplossen van productproblemen, accountbeheer en klanttevredenheid.

Je rol is om:
- Snelle en behulpzame klantenondersteuning te bieden
- Veelvoorkomende productproblemen op te lossen
- Klanten te begeleiden door instellingen en processen
- Te assisteren met accountbeheer en facturering
- Complexe problemen te escaleren naar menselijke agenten wanneer gepast

Richtlijnen:
- Wees geduldig, empathisch en professioneel
- Geef duidelijke stapsgewijze instructies
- Verifieer begrip voordat je verdergaat
- Bied meerdere oplossingen aan wanneer mogelijk
- Documenteer veelvoorkomende problemen voor toekomstige verbeteringen
- Focus op probleemoplossing en klanttevredenheid

Geef altijd prioriteit aan klantervaring en bied nauwkeurige, behulpzame oplossingen.`,
        'domain.it.name': 'IT-ondersteuning & Technische Helpdesk',
        'domain.it.desc': 'Een technische ondersteuningsassistent die medewerkers begeleidt door systeemconfiguratie, software-installatie, probleemoplossing en beveiligingsbest practices. Biedt nauwkeurige technische stapsgewijze begeleiding.',
        'domain.it.agent': 'IT-ondersteuning Specialist',
        'domain.it.prompt': `Je bent een ervaren IT-ondersteuning Specialist met uitgebreide kennis van systeeminfrastructuur, softwaretoepassingen, netwerken en cyberbeveiliging.

Je rol is om:
- Technische ondersteuning te bieden voor hardware- en softwareproblemen
- Gebruikers te begeleiden door software-installatie en -configuratie
- Netwerk- en connectiviteitsproblemen op te lossen
- Gebruikers te onderwijzen over beveiligingsbest practices
- Te assisteren met accountbeheer en machtigingen

Richtlijnen:
- Geef duidelijke technische stapsgewijze instructies
- Pas uitleg aan op het technische niveau van de gebruiker
- Geef prioriteit aan beveiliging en best practices
- Documenteer oplossingen voor veelvoorkomende problemen
- Escaleer kritieke systeemproblemen naar gespecialiseerde teams
- Blijf up-to-date met systeemupdates en beveiligingspatches

Zorg ervoor dat alle begeleiding het IT-beleid en beveiligingsstandaarden van het bedrijf volgt.`,
        'domain.sales.name': 'Verkoop Assistent & CRM Helper',
        'domain.sales.desc': 'Een verkoopondersteuningstool die verkoopteams helpt met productinformatie, prijzen, bezwaarafhandeling en afsluittechnieken. Ondersteunt het hele verkoopproces van ontdekking tot afsluiting.',
        'domain.sales.agent': 'Verkoop Assistent',
        'domain.sales.prompt': `Je bent een ervaren Verkoopconsultant met diepgaande kennis van verkoopmethodologieën, productkennis, concurrentieanalyse en klantrelatiebeheer.

Je rol is om:
- Te assisteren met productinformatie en positionering
- Begeleiding te bieden over prijzen en kortingen
- Te helpen bij het overwinnen van veelvoorkomende verkoopbezwaren
- Afsluittechnieken en -strategieën voor te stellen
- Lead-kwalificatie en ontdekkingsprocessen te ondersteunen

Richtlijnen:
- Focus op het creëren van klantwaarde
- Lever nauwkeurige productinformatie
- Stel consultatieve, niet-agressieve benaderingen voor
- Begrijp klantbehoeften voordat je oplossingen aanbeveelt
- Blijf up-to-date over concurrenten en markttrends
- Stem verkoopstrategieën af op bedrijfsdoelen

Geef altijd prioriteit aan langetermijnklantrelaties boven kortetermijnwinsten.`
    }
};

// Function to update page UI based on language selection
function updatePageLanguage(language) {
    // This will affect the entire page interface
    const languageMap = {
        'english': 'en',
        'japanese': 'ja',
        'portuguese': 'pt',
        'spanish': 'es',
        'french': 'fr',
        'german': 'de',
        'italian': 'it',
        'korean': 'ko',
        'dutch': 'nl',
        'multilingual': 'auto'
    };

    const langCode = languageMap[language] || 'en';
    document.documentElement.lang = langCode;

    // Store in localStorage for persistence
    localStorage.setItem('preferredLanguage', language);

    // Update agentConfig language so Quick Examples work correctly
    agentConfig.language = language;

    // Apply translations to the page
    applyTranslations(language);

    // Visual feedback
    console.log(`Page language set to: ${language} (${langCode})`);
}

// Apply translations to all elements with data-i18n attribute
function applyTranslations(language) {
    const dict = translations[language] || translations['english'];

    // Translate all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (dict[key]) {
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = dict[key];
            } else {
                element.innerHTML = dict[key];
            }
        }
    });

    // Translate specific placeholders by ID
    const chatInput = document.getElementById('aiChatInput');
    if (chatInput && dict['chat.placeholder']) {
        chatInput.placeholder = dict['chat.placeholder'];
    }

    const agentDescription = document.getElementById('agentDescription');
    if (agentDescription && dict['example.text']) {
        agentDescription.placeholder = dict['example.text'];
    }

    const agentAudience = document.getElementById('agentAudience');
    if (agentAudience && dict['audience.placeholder']) {
        agentAudience.placeholder = dict['audience.placeholder'];
    }

    console.log(`Applied ${language} translations to page`);
}

// Get translated message
function getTranslation(key, fallback = '') {
    const currentLang = agentConfig.language || 'english';
    const dict = translations[currentLang] || translations['english'];
    return dict[key] || fallback || key;
}

// Event Listeners
function setupEventListeners() {
    // Drag and Drop Layout Customization
    setupDragAndDrop();

    // Scroll Navigation Buttons
    setupScrollNavigation();

    // Navigation
    document.getElementById('nextBtn').addEventListener('click', nextStep);
    document.getElementById('prevBtn').addEventListener('click', prevStep);

    // AI Chat
    document.getElementById('aiSendBtn').addEventListener('click', sendToAI);
    document.getElementById('aiStopBtn').addEventListener('click', stopResponse);
    document.getElementById('aiChatInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            sendToAI();
        }
    });

    // Quick Examples
    document.querySelectorAll('.quick-example').forEach(btn => {
        btn.addEventListener('click', function() {
            const example = this.dataset.example;
            loadQuickExample(example);
        });
    });

    // Sidebar navigation (dashboard layout)
    document.querySelectorAll('.step-nav-item, .progress-step').forEach(navItem => {
        navItem.addEventListener('click', function() {
            const step = parseInt(this.dataset.step);
            if (!isNaN(step) && step >= 0 && step <= 7) {
                currentStep = step;
                updateStepDisplay();
            }
        });
    });

    // Step 0: Agent Description (if exists)
    const agentDesc = document.getElementById('agentDescription');
    if (agentDesc) {
        agentDesc.addEventListener('input', function() {
            agentConfig.description = this.value;
        });
    }

    const agentTone = document.getElementById('agentTone');
    if (agentTone) {
        agentTone.addEventListener('change', function() {
            agentConfig.tone = this.value;
        });
    }

    // Global Language Selector (in header)
    const globalLanguage = document.getElementById('globalLanguage');
    if (globalLanguage) {
        globalLanguage.addEventListener('change', function() {
            agentConfig.language = this.value;

            // Update UI text based on language selection
            updatePageLanguage(this.value);
        });
    }

    const agentAudience = document.getElementById('agentAudience');
    if (agentAudience) {
        agentAudience.addEventListener('input', function() {
            agentConfig.audience = this.value;
        });
    }

    // Generate Agent Button
    const generateBtn = document.getElementById('aiGenerateBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateAgent);
    }

    // Cancel Generation Button
    const cancelGenerateBtn = document.getElementById('cancelGenerateBtn');
    if (cancelGenerateBtn) {
        cancelGenerateBtn.addEventListener('click', cancelGeneration);
    }

    // Reset Button
    document.getElementById('resetBtn')?.addEventListener('click', resetWizard);

    // Clear Auto-Save Link
    const clearAutoSaveLink = document.getElementById('clearAutoSaveLink');
    if (clearAutoSaveLink) {
        clearAutoSaveLink.addEventListener('click', function(e) {
            e.preventDefault();
            clearAutoSave();
        });
    }

    // File attachment event listeners
    const attachFileBtn = document.getElementById('attachFileBtn');
    const chatAttachment = document.getElementById('chatAttachment');
    const removeAttachmentBtn = document.getElementById('removeAttachmentBtn');

    if (attachFileBtn) {
        attachFileBtn.addEventListener('click', function() {
            if (chatAttachment) {
                chatAttachment.click();
            }
        });
    }

    if (chatAttachment) {
        chatAttachment.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                handleFileAttachment(file);
            }
        });
    }

    if (removeAttachmentBtn) {
        removeAttachmentBtn.addEventListener('click', clearAttachment);
    }

    // Temperature slider and input box
    const tempSlider = document.getElementById('temperature');
    const tempInput = document.getElementById('temperatureInput');
    if (tempSlider && tempInput) {
        // Sync slider -> input
        tempSlider.addEventListener('input', function() {
            const value = parseFloat(this.value);
            tempInput.value = value;
            agentConfig.temperature = value;
        });
        // Sync input -> slider
        tempInput.addEventListener('input', function() {
            let value = parseFloat(this.value);
            // Validate range
            if (value < 0) value = 0;
            if (value > 1) value = 1;
            this.value = value;
            tempSlider.value = value;
            agentConfig.temperature = value;
        });
    }

    // Max Tools Iterations slider and input box
    const maxToolsIterationsSlider = document.getElementById('maxToolsIterations');
    const maxToolsIterationsInput = document.getElementById('maxToolsIterationsInput');
    if (maxToolsIterationsSlider && maxToolsIterationsInput) {
        // Sync slider -> input
        maxToolsIterationsSlider.addEventListener('input', function() {
            const value = parseInt(this.value);
            maxToolsIterationsInput.value = value;
            agentConfig.maxToolsIterations = value;
        });
        // Sync input -> slider
        maxToolsIterationsInput.addEventListener('input', function() {
            let value = parseInt(this.value);
            // Validate range
            if (value < 0) value = 0;
            if (value > 10) value = 10;
            this.value = value;
            maxToolsIterationsSlider.value = value;
            agentConfig.maxToolsIterations = value;
        });
    }

    // Model selection
    const modelSelect = document.getElementById('modelSelect');
    if (modelSelect) {
        modelSelect.addEventListener('change', function() {
            agentConfig.model = this.value;
            updateModelRecommendation();
        });
    }

    // Regenerate prompt
    document.getElementById('regeneratePromptBtn')?.addEventListener('click', regenerateSystemPrompt);

    // Refine prompt with AI
    document.getElementById('refinePromptBtn')?.addEventListener('click', refineSystemPrompt);

    // Add KB button
    document.getElementById('addKBBtn')?.addEventListener('click', () => addKnowledgeBase());

    // Add Tool button (Step 4)
    document.getElementById('addToolBtn')?.addEventListener('click', addTool);

    // Add Output button (Step 5)
    document.getElementById('addOutputBtn')?.addEventListener('click', addOutput);

    // Add Prompt Variable button (Step 6)
    document.getElementById('addPromptVariableBtn')?.addEventListener('click', addPromptVariable);

    // Download buttons
    document.getElementById('viewOutputBtn')?.addEventListener('click', viewOutputWebpage);
    document.getElementById('shareOutputBtn')?.addEventListener('click', shareOutputWebpage);
    document.getElementById('downloadKBsBtn')?.addEventListener('click', downloadKnowledgeBases);
    document.getElementById('downloadProjectBtn')?.addEventListener('click', downloadProjectConfig);
    document.getElementById('downloadAgentBtn')?.addEventListener('click', downloadAgentConfig);
    document.getElementById('downloadAllBtn')?.addEventListener('click', downloadAllFilesAsZip);

    // System Prompt Character Counter
    const systemPromptTextarea = document.getElementById('systemPrompt');
    if (systemPromptTextarea) {
        systemPromptTextarea.addEventListener('input', updateSystemPromptCharCount);
        // Initialize count on page load
        updateSystemPromptCharCount();
    }

    // API Connection Status
    document.getElementById('configureApiBtn')?.addEventListener('click', showApiKeyModal);
    document.getElementById('closeApiModalBtn')?.addEventListener('click', hideApiKeyModal);
    document.getElementById('saveApiConfigBtn')?.addEventListener('click', saveApiSettings);
    document.getElementById('testConnectionBtn')?.addEventListener('click', testApiConnection);

    // Templates
    document.getElementById('templatesBtn')?.addEventListener('click', showTemplatesModal);
    document.getElementById('closeTemplatesModalBtn')?.addEventListener('click', hideTemplatesModal);
    document.getElementById('cancelTemplateBtn')?.addEventListener('click', hideTemplatesModal);

    // Collaboration (Import/Export)
    document.getElementById('importConfigBtn')?.addEventListener('click', importAgentConfig);
    document.getElementById('exportConfigBtn')?.addEventListener('click', exportAgentConfig);

    // Markdown Preview Toggle
    document.getElementById('toggleSystemPromptPreview')?.addEventListener('click', toggleSystemPromptPreview);

    // Auto-save listeners (debounced)
    setupAutoSave();

    // Initialize progress bar
    updateProgressBar();
}

// API Connection Status Management
async function checkApiKeyStatus() {
    console.log('🔍 Checking TD LLM API connection...');
    console.log('  tdLlmAPI exists:', typeof tdLlmAPI !== 'undefined');

    // Test connection with a health check via proxy
    try {
        const status = await tdLlmAPI.checkConnection();

        if (status.connected) {
            updateApiStatusIndicator(true);
            console.log('✅ Connected to TD LLM API via proxy');
            addChatMessage('assistant', getTranslation('sidebar.connected'));
        } else {
            throw new Error(status.message || 'Health check failed');
        }
    } catch (error) {
        console.error('❌ Connection failed:', error);
        updateApiStatusIndicator(false);
        // Don't add error message yet - will show when user tries to interact
    }
}

async function showApiKeyModal() {
    document.getElementById('apiKeyModal').classList.remove('hidden');
    // Update the modal content with current connection status
    await updateApiModalStatus();
}

function hideApiKeyModal() {
    document.getElementById('apiKeyModal').classList.add('hidden');
}

function updateApiStatusIndicator(isConnected) {
    const indicator = document.getElementById('apiStatusIndicator');
    if (indicator) {
        indicator.textContent = isConnected ? '🟢' : '🔴';
    }
}

async function updateApiModalStatus() {
    const statusIcon = document.getElementById('connectionStatusIcon');
    const statusText = document.getElementById('connectionStatusText');
    const statusDetail = document.getElementById('connectionStatusDetail');
    const container = document.getElementById('apiModalStatusContainer');
    const agentIdInput = document.getElementById('agentIdInput');
    const modelSelect = document.getElementById('tdModelSelect');

    if (!container) return;

    // Load saved settings into form
    if (agentIdInput && tdLlmAPI.getAgentId()) {
        agentIdInput.value = tdLlmAPI.getAgentId();
    }
    if (modelSelect && tdLlmAPI.getModel()) {
        modelSelect.value = tdLlmAPI.getModel();
    }

    // Check connection
    try {
        const status = await tdLlmAPI.checkConnection();

        if (status.connected) {
            // Connected state
            if (statusIcon) statusIcon.textContent = '✅';
            if (statusText) statusText.textContent = 'Connected to TD LLM Proxy';
            if (statusDetail) statusDetail.textContent = status.message || 'Proxy server is running on localhost:3001';

            container.querySelector('div').className = 'bg-green-50 border border-green-200 rounded-lg p-4';
            updateApiStatusIndicator(true);
        } else {
            throw new Error(status.message || 'Connection failed');
        }
    } catch (error) {
        // Disconnected state
        if (statusIcon) statusIcon.textContent = '❌';
        if (statusText) statusText.textContent = 'Connection Failed';
        if (statusDetail) statusDetail.textContent = error.message || 'Could not connect to proxy server';

        container.querySelector('div').className = 'bg-red-50 border border-red-200 rounded-lg p-4';
        updateApiStatusIndicator(false);
    }
}

// Save API settings from modal
function saveApiSettings() {
    const agentIdInput = document.getElementById('agentIdInput');
    const modelSelect = document.getElementById('tdModelSelect');

    if (agentIdInput) {
        tdLlmAPI.setAgentId(agentIdInput.value.trim());
    }
    if (modelSelect) {
        tdLlmAPI.setModel(modelSelect.value);
    }

    // Reset chat session to apply new settings
    tdLlmAPI.resetChatSession();

    showToast('Settings saved successfully!', 'success');
    hideApiKeyModal();
}

// Test connection button handler
async function testApiConnection() {
    const statusIcon = document.getElementById('connectionStatusIcon');
    const statusText = document.getElementById('connectionStatusText');
    const statusDetail = document.getElementById('connectionStatusDetail');
    const container = document.getElementById('apiModalStatusContainer');

    // Show loading state
    if (statusIcon) statusIcon.textContent = '⏳';
    if (statusText) statusText.textContent = 'Testing Connection...';
    if (statusDetail) statusDetail.textContent = 'Connecting to proxy server...';
    container.querySelector('div').className = 'bg-gray-50 border border-gray-200 rounded-lg p-4';

    // Small delay for UX
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check connection
    await updateApiModalStatus();
}

// AI Chat Functions
async function sendToAI() {
    const input = document.getElementById('aiChatInput');
    const message = input.value.trim();
    const errorDiv = document.getElementById('chatInputError');
    const sendBtn = document.getElementById('aiSendBtn');
    const stopBtn = document.getElementById('aiStopBtn');

    // Validate input - allow attachment-only messages
    if (!message && !currentAttachment) {
        // Show error message
        if (errorDiv) {
            errorDiv.textContent = '⚠️ Please enter a message or attach a file';
            errorDiv.style.display = 'block';
            // Add red border to input
            input.classList.add('border-red-500');
            input.classList.remove('border-gray-300');

            // Hide error after 3 seconds
            setTimeout(function() {
                errorDiv.style.display = 'none';
                input.classList.remove('border-red-500');
                input.classList.add('border-gray-300');
            }, 3000);
        }
        return;
    }

    // Hide error if it was showing
    if (errorDiv) {
        errorDiv.style.display = 'none';
        input.classList.remove('border-red-500');
        input.classList.add('border-gray-300');
    }

    // Toggle buttons - show stop, hide send
    if (sendBtn) sendBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'block';

    // Create abort controller for this request
    chatAbortController = new AbortController();

    // Build full message including attachment
    let fullMessage = message;
    let displayMessage = message;

    if (currentAttachment) {
        // Add attachment content to the message sent to AI
        fullMessage = message
            ? message + '\n\n[Attached file: ' + currentAttachment.name + ']\n' + currentAttachment.content
            : '[Attached file: ' + currentAttachment.name + ']\n' + currentAttachment.content;

        // Display message with attachment indicator (plain text to avoid HTML injection)
        displayMessage = message
            ? message + '\n📎 ' + currentAttachment.name
            : '📎 ' + currentAttachment.name;
    }

    // Save message as agent description if it looks like a description
    if (message.length > 20 && !agentConfig.description) {
        agentConfig.description = message;
    }

    // Add user message to chat
    addChatMessage('user', displayMessage);
    chatHistory.push({ role: 'user', content: fullMessage });

    // Clear input and attachment (silent to avoid toast notification)
    input.value = '';
    clearAttachment(true);

    // Show typing indicator
    showTypingIndicator('Agent Foundry Assistant is thinking...');

    try {
        // Check if TD LLM API is available
        if (typeof claudeAPI === 'undefined') {
            throw new Error('TD LLM API not loaded. Please refresh the page.');
        }

        console.log('📤 Sending message to TD LLM API:', message.substring(0, 50) + '...');

        // Always use live TD LLM API with streaming
        const aiResponse = await claudeAPI.sendMessage(
            message,
            chatHistory.slice(0, -1), // Don't include the message we just added
            (chunk, fullText) => {
                // Update the typing indicator with streaming text
                updateTypingIndicator(fullText);
            },
            chatAbortController?.signal // Pass abort signal
        );

        removeTypingIndicator();

        // If AI provided agent recommendations, auto-populate and add helpful message
        let finalResponse = aiResponse;
        if (aiResponse.includes('Agent') && (aiResponse.includes('Knowledge Base') || aiResponse.includes('Model:') || aiResponse.includes('Temperature:'))) {
            const descriptionTextarea = document.getElementById('agentDescription');
            if (descriptionTextarea && !descriptionTextarea.value.trim()) {
                // Populate with the user's original question
                descriptionTextarea.value = message;
                agentConfig.description = message;
                console.log('✅ Auto-populated description from chat message');

                // Add a helpful message
                finalResponse += `<br><br>💡 <strong>Tip:</strong> I've automatically filled in your agent description below. You can now click <strong>"✨ Auto-Generate Agent"</strong> to create your agent with these recommendations!`;
            }
        }

        addChatMessage('assistant', finalResponse);
        chatHistory.push({ role: 'assistant', content: aiResponse });

    } catch (error) {
        console.error('❌ AI Error:', error);
        removeTypingIndicator();

        // Check if request was aborted
        if (error.name === 'AbortError' || chatAbortController?.signal.aborted) {
            addChatMessage('assistant', '⏸️ <strong>Response stopped.</strong> Feel free to ask another question!');
        } else {
            // Update connection status to show disconnected
            updateApiStatusIndicator(false);
            addChatMessage('assistant', `⚠️ <strong>Error:</strong> ${error.message}<br><br>Please ensure:<br>• The proxy is running (node claude-code-proxy.cjs)<br>• Your API key is configured in .env file<br>• You have an active internet connection`);
        }
    } finally {
        // Always restore buttons
        const sendBtn = document.getElementById('aiSendBtn');
        const stopBtn = document.getElementById('aiStopBtn');
        if (sendBtn) sendBtn.style.display = 'block';
        if (stopBtn) stopBtn.style.display = 'none';

        // Clear abort controller
        chatAbortController = null;
    }
}

// Stop ongoing AI response
function stopResponse() {
    console.log('🛑 User requested to stop response');

    // Abort the ongoing request
    if (chatAbortController) {
        chatAbortController.abort();
        console.log('✅ Request aborted');
    }

    // Remove typing indicator
    removeTypingIndicator();

    // Restore buttons immediately
    const sendBtn = document.getElementById('aiSendBtn');
    const stopBtn = document.getElementById('aiStopBtn');
    if (sendBtn) sendBtn.style.display = 'block';
    if (stopBtn) stopBtn.style.display = 'none';

    // Show stopped message
    addChatMessage('assistant', '⏸️ <strong>Response stopped.</strong> Feel free to ask another question!');
}

function addChatMessage(role, content) {
    const messagesDiv = document.getElementById('aiChatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message';

    if (role === 'user') {
        messageDiv.className += ' bg-white border border-gray-200 rounded-lg p-3';
        messageDiv.innerHTML = `<p class="text-sm text-gray-800"><strong>You:</strong> ${content}</p>`;
    } else {
        messageDiv.className += ' bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100';

        // Check if content already contains HTML (skip markdown parsing if so)
        const containsHtml = /<[a-z][\s\S]*>/i.test(content);

        let formattedContent = content;
        if (!containsHtml && typeof marked !== 'undefined' && marked.parse) {
            // Parse markdown only for plain text content
            try {
                formattedContent = marked.parse(content);
            } catch (e) {
                console.warn('Markdown parsing failed:', e);
            }
        }
        messageDiv.innerHTML = `<div class="text-sm text-gray-800 prose-chat">${formattedContent}</div>`;
    }

    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function showTypingIndicator(message = 'TD Agent Foundry is generating...') {
    const messagesDiv = document.getElementById('aiChatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typingIndicator';
    typingDiv.className = 'ai-message bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100';
    typingDiv.innerHTML = `
        <div class="flex items-center gap-2">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
            <span class="text-sm text-gray-600" id="typingMessage">${message}</span>
        </div>
        <div id="streamingText" class="text-sm text-gray-800 mt-2 hidden"></div>
    `;
    messagesDiv.appendChild(typingDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function updateTypingIndicator(text) {
    const streamingText = document.getElementById('streamingText');
    if (streamingText) {
        streamingText.classList.remove('hidden');
        // Parse markdown for streaming text
        let formattedText = text;
        if (typeof marked !== 'undefined' && marked.parse) {
            try {
                formattedText = marked.parse(text);
            } catch (e) {
                // Fallback to raw text if markdown parsing fails
            }
        }
        streamingText.innerHTML = `<div class="prose-chat">${formattedText}</div>`;
        const messagesDiv = document.getElementById('aiChatMessages');
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

// Demo mode removed - all responses now come from real TD LLM API via claude-code-proxy.cjs

// Quick Example Loaders
function loadQuickExample(type) {
    // Get current language
    const currentLang = agentConfig.language || 'english';

    const examples = {
        english: {
            'campaign-building': `I want to build a campaign planning agent that helps marketers with:
- Creating comprehensive marketing campaign strategies
- Planning multi-channel campaigns (Meta, Google, TikTok, Pinterest)
- Developing campaign messaging and creative briefs
- Setting campaign objectives and KPIs
- Budget allocation across channels
- Timeline and milestone planning

The agent should be strategic, creative, and provide actionable recommendations based on campaign planning frameworks and advertising best practices.`,
            'campaign-optimization': `I need a campaign optimization agent that assists marketers with:
- Analyzing campaign performance across all channels
- Identifying optimization opportunities (targeting, creative, bidding)
- A/B testing strategies and recommendations
- Budget reallocation based on performance
- Audience refinement and expansion strategies
- Ad creative performance analysis

The agent should be data-driven, analytical, and provide specific optimization tactics to improve campaign ROI.`,
            'campaign-reporting': `I want a campaign reporting agent that helps marketers with:
- Generating comprehensive campaign performance reports
- Analyzing metrics across Meta, Google, TikTok, Pinterest platforms
- Calculating ROI, ROAS, CPA, and other key metrics
- Identifying trends and insights from campaign data
- Creating executive summaries and presentations
- Benchmarking performance against industry standards

The agent should be analytical, clear, and able to translate complex data into actionable insights and recommendations.`
        },
        japanese: {
            'campaign-building': `マーケターを支援するキャンペーン計画エージェントを構築したいです：
- 包括的なマーケティングキャンペーン戦略の作成
- マルチチャネルキャンペーンの計画（Meta、Google、TikTok、Pinterest）
- キャンペーンメッセージとクリエイティブブリーフの開発
- キャンペーン目標とKPIの設定
- チャネル間での予算配分
- タイムラインとマイルストーンの計画

エージェントは戦略的で創造的であり、キャンペーン計画フレームワークと広告のベストプラクティスに基づいた実用的な推奨事項を提供する必要があります。`,
            'campaign-optimization': `マーケターを支援するキャンペーン最適化エージェントが必要です：
- すべてのチャネルでのキャンペーンパフォーマンスの分析
- 最適化の機会の特定（ターゲティング、クリエイティブ、入札）
- A/Bテスト戦略と推奨事項
- パフォーマンスに基づく予算の再配分
- オーディエンスの絞り込みと拡大戦略
- 広告クリエイティブのパフォーマンス分析

エージェントはデータ駆動型で分析的であり、キャンペーンROIを改善するための具体的な最適化戦術を提供する必要があります。`,
            'campaign-reporting': `マーケターを支援するキャンペーンレポートエージェントが必要です：
- 包括的なキャンペーンパフォーマンスレポートの生成
- Meta、Google、TikTok、Pinterestプラットフォームのメトリクス分析
- ROI、ROAS、CPA、その他の主要メトリクスの計算
- キャンペーンデータからのトレンドとインサイトの特定
- エグゼクティブサマリーとプレゼンテーションの作成
- 業界標準に対するパフォーマンスのベンチマーク

エージェントは分析的で明確であり、複雑なデータを実用的なインサイトと推奨事項に変換できる必要があります。`
        },
        portuguese: {
            'campaign-building': `Quero construir um agente de planejamento de campanhas que ajude profissionais de marketing com:
- Criação de estratégias abrangentes de campanha de marketing
- Planejamento de campanhas multicanais (Meta, Google, TikTok, Pinterest)
- Desenvolvimento de mensagens de campanha e briefings criativos
- Definição de objetivos de campanha e KPIs
- Alocação de orçamento entre canais
- Planejamento de cronograma e marcos

O agente deve ser estratégico, criativo e fornecer recomendações acionáveis baseadas em estruturas de planejamento de campanha e melhores práticas de publicidade.`,
            'campaign-optimization': `Preciso de um agente de otimização de campanhas que auxilie profissionais de marketing com:
- Análise de desempenho de campanha em todos os canais
- Identificação de oportunidades de otimização (segmentação, criativo, lances)
- Estratégias e recomendações de testes A/B
- Realocação de orçamento com base no desempenho
- Estratégias de refinamento e expansão de público
- Análise de desempenho de criativos de anúncios

O agente deve ser orientado por dados, analítico e fornecer táticas específicas de otimização para melhorar o ROI da campanha.`,
            'campaign-reporting': `Quero um agente de relatórios de campanhas que ajude profissionais de marketing com:
- Geração de relatórios abrangentes de desempenho de campanha
- Análise de métricas nas plataformas Meta, Google, TikTok, Pinterest
- Cálculo de ROI, ROAS, CPA e outras métricas-chave
- Identificação de tendências e insights dos dados de campanha
- Criação de resumos executivos e apresentações
- Comparação de desempenho com padrões do setor

O agente deve ser analítico, claro e capaz de traduzir dados complexos em insights e recomendações acionáveis.`
        }
    };

    // Get examples for current language, fallback to English
    const langExamples = examples[currentLang] || examples['english'];

    // Try to populate chat input (dashboard layout)
    const chatInput = document.getElementById('aiChatInput');
    if (chatInput) {
        chatInput.value = langExamples[type];
        agentConfig.description = langExamples[type]; // Save to config too!
        chatInput.focus();
        return;
    }

    // Fallback to agent description (original layout)
    const textarea = document.getElementById('agentDescription');
    if (textarea) {
        textarea.value = langExamples[type];
        agentConfig.description = langExamples[type];

        // Also try to populate AI chat if it exists
        const fallbackChatInput = document.getElementById('aiChatInput');
        if (fallbackChatInput) {
            fallbackChatInput.value = langExamples[type];
        }
    }
}

// Cancel Generation
function cancelGeneration() {
    generationCancelled = true;
    console.log('🛑 User requested generation cancellation');

    // Stop the generation timer
    stopGenerationTimer(false);

    // Immediately hide cancel button and show generate button
    const generateBtn = document.getElementById('aiGenerateBtn');
    const cancelBtn = document.getElementById('cancelGenerateBtn');
    if (generateBtn) generateBtn.style.display = 'block';
    if (cancelBtn) cancelBtn.style.display = 'none';

    addChatMessage('assistant', '⏸️ Cancelling generation... Please wait for the current operation to complete.');
}

// Start generation timer
function startGenerationTimer() {
    generationStartTime = Date.now();
    const timerDiv = document.getElementById('generationTimer');
    const elapsedSpan = document.getElementById('elapsedTime');
    const progressBar = document.getElementById('progressBar');

    if (!timerDiv) return;

    // Show timer
    timerDiv.style.display = 'block';

    // Update elapsed time every second
    generationTimer = setInterval(function() {
        const elapsedSeconds = Math.floor((Date.now() - generationStartTime) / 1000);

        if (elapsedSpan) {
            elapsedSpan.textContent = elapsedSeconds + 's';
        }

        // Update progress bar (capped at 95% until complete)
        if (progressBar) {
            const progress = Math.min(95, (elapsedSeconds / ESTIMATED_GENERATION_TIME) * 100);
            progressBar.style.width = progress + '%';
        }
    }, 1000);
}

// Stop generation timer
function stopGenerationTimer(success) {
    if (success === undefined) success = true;

    if (generationTimer) {
        clearInterval(generationTimer);
        generationTimer = null;
    }

    const timerDiv = document.getElementById('generationTimer');
    const progressBar = document.getElementById('progressBar');

    if (success && progressBar) {
        // Complete the progress bar
        progressBar.style.width = '100%';
    }

    // Hide timer after a short delay
    setTimeout(function() {
        if (timerDiv) {
            timerDiv.style.display = 'none';
        }
        // Reset progress bar
        if (progressBar) {
            progressBar.style.width = '0%';
        }
    }, success ? 2000 : 500);
}

// Auto-Generate Agent
async function generateAgent() {
    // Reset cancellation flag
    generationCancelled = false;

    // Show cancel button, hide generate button
    const generateBtn = document.getElementById('aiGenerateBtn');
    const cancelBtn = document.getElementById('cancelGenerateBtn');
    if (generateBtn) generateBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'block';

    // Get description from textarea or chat input (dashboard layout)
    const descriptionTextarea = document.getElementById('agentDescription');
    const chatInput = document.getElementById('aiChatInput');

    // Check each source in order, use first non-empty value
    let description = '';
    if (descriptionTextarea && descriptionTextarea.value.trim()) {
        description = descriptionTextarea.value.trim();
    } else if (chatInput && chatInput.value.trim()) {
        description = chatInput.value.trim();
    } else if (agentConfig.description) {
        description = agentConfig.description;
    }

    if ((!description || description.length < 20) && !currentAttachment) {
        console.log('🚫 Validation failed:');
        console.log('  - descriptionTextarea.value:', descriptionTextarea ? `"${descriptionTextarea.value.substring(0, 50)}..." (${descriptionTextarea.value.length})` : 'N/A');
        console.log('  - chatInput.value:', chatInput ? `"${chatInput.value.substring(0, 50)}..." (${chatInput.value.length})` : 'N/A');
        console.log('  - agentConfig.description:', agentConfig.description ? `"${agentConfig.description.substring(0, 50)}..." (${agentConfig.description.length})` : 'empty');
        console.log('  - final description:', description ? `"${description.substring(0, 50)}..." (${description.length})` : 'empty');
        console.log('  - currentAttachment:', currentAttachment ? currentAttachment.name : 'none');

        const currentLang = agentConfig.language || 'english';
        const dict = translations[currentLang] || translations['english'];
        alert(dict['validation.description.required'] || 'Please describe your agent first! Add at least a brief description (minimum 20 characters) or attach a file with agent details.');
        // Focus on the appropriate input field
        if (chatInput) {
            chatInput.focus();
        } else if (descriptionTextarea) {
            descriptionTextarea.focus();
        }
        // Restore buttons
        if (generateBtn) generateBtn.style.display = 'block';
        if (cancelBtn) cancelBtn.style.display = 'none';
        return;
    }

    // Build full description including attachment
    let fullDescription = description;

    if (currentAttachment) {
        // Add attachment content to the description sent to AI
        fullDescription = description
            ? description + '\n\n[Attached file: ' + currentAttachment.name + ']\n' + currentAttachment.content
            : '[Attached file: ' + currentAttachment.name + ']\n' + currentAttachment.content;
    }

    // Update agentConfig with description (without attachment for storage)
    agentConfig.description = description || 'This agent has been automatically configured based on the attached file content and requirements.';

    // Also populate the agentDescription textarea if it exists (for Step 0 validation)
    const descTextarea = document.getElementById('agentDescription');
    if (descTextarea && !descTextarea.value.trim()) {
        descTextarea.value = description || 'This agent has been automatically configured based on the attached file content and requirements.';
    }

    showTypingIndicator(getTranslation('sidebar.generating'));

    // Start the generation timer
    startGenerationTimer();

    try {
        // Check if TD LLM API is available
        if (typeof claudeAPI === 'undefined') {
            throw new Error('TD LLM API not loaded. Please refresh the page.');
        }

        // Get language preference
        const languageMap = {
            'english': 'English',
            'japanese': 'Japanese',
            'portuguese': 'Portuguese',
            'spanish': 'Spanish',
            'french': 'French',
            'german': 'German',
            'italian': 'Italian',
            'korean': 'Korean',
            'dutch': 'Dutch',
            'multilingual': 'multiple languages (multilingual)'
        };
        const languageName = languageMap[agentConfig.language] || 'English';
        const languageInstruction = agentConfig.language === 'multilingual'
            ? '\n\nLanguage Requirement: The agent should be multilingual and respond in the same language as the user\'s query.'
            : `\n\nLanguage Requirement: The agent should respond in ${languageName}.`;

        // Track AI generation start time
        wizardStats.aiGenerationStartTime = Date.now();
        wizardStats.aiApiCalls++;
        console.log('📊 AI generation started at:', new Date(wizardStats.aiGenerationStartTime).toLocaleTimeString());

        // Ask AI to generate the full configuration
        const prompt = `Based on this agent description:\n\n"${fullDescription}"${languageInstruction}\n\nGenerate ONLY a JSON object (no other text) with this exact structure:\n\n{\n  "domain": "marketing",\n  "agentName": "Campaign Planning Expert",\n  "knowledgeBases": [\n    {\n      "name": "Campaign Planning Guide",\n      "description": "Comprehensive guide for planning marketing campaigns. Include best practices for:\n- Setting SMART goals and KPIs\n- Defining target audiences and personas\n- Budget allocation strategies\n- Timeline and milestone planning\n- Campaign brief templates"\n    },\n    {\n      "name": "Platform Best Practices",\n      "description": "Best practices for Meta, Google, TikTok advertising. Cover:\n- Platform-specific ad formats and specs\n- Audience targeting options\n- Bidding strategies\n- Creative guidelines\n- A/B testing frameworks"\n    }\n  ],\n  "outputs": [\n    {\n      "outputName": "campaign_plan",\n      "functionName": "generate_campaign_plan",\n      "functionDescription": "Generate a comprehensive digital marketing campaign plan including strategy, objectives, target audience, budget allocation, creative direction, KPIs, and implementation timeline",\n      "outputType": "custom",\n      "jsonSchema": "{\\"type\\": \\"object\\", \\"properties\\": {\\"campaign_objective\\": {\\"type\\": \\"string\\"}, \\"target_audience\\": {\\"type\\": \\"object\\"}, \\"budget_allocation\\": {\\"type\\": \\"object\\"}, \\"creative_direction\\": {\\"type\\": \\"string\\"}, \\"kpi_targets\\": {\\"type\\": \\"array\\"}, \\"platform_strategy\\": {\\"type\\": \\"object\\"}, \\"timeline\\": {\\"type\\": \\"string\\"}}, \\"required\\": [\\"campaign_objective\\", \\"budget_allocation\\", \\"kpi_targets\\"]}"\n    },\n    {\n      "outputName": ":plotly:",\n      "functionName": "generate_performance_chart",\n      "functionDescription": "Create interactive performance visualizations using Plotly.js for campaign metrics and analytics",\n      "outputType": "custom",\n      "jsonSchema": "{\\"type\\": \\"object\\", \\"properties\\": {\\"data\\": {\\"type\\": \\"array\\"}, \\"layout\\": {\\"type\\": \\"object\\"}}, \\"required\\": [\\"data\\"]}"\n    }\n  ],\n  "model": "anthropic.claude-4.5-sonnet",\n  "temperature": 0.7,\n  "maxToolsIterations": 3,\n  "modelReasoning": "Claude 4.5 Sonnet is the latest balanced model with superior reasoning and reduced hallucinations, ideal for marketing tasks. Temperature 0.7 allows creative campaign suggestions while maintaining consistency. Max Tools Iterations set to 3 allows the agent to refine tool calls for better results.",\n  "systemPrompt": "You are an expert campaign strategist and marketing advisor for Treasure Data. Your role is to help marketers plan, optimize, and execute comprehensive marketing campaigns across multiple channels including Meta, Google, TikTok, and LinkedIn.\\n\\nYour expertise includes:\\n- Campaign planning and goal setting\\n- Audience targeting and segmentation\\n- Budget allocation and optimization\\n- Creative strategy and messaging\\n- Performance analytics and reporting\\n\\nProvide actionable, data-driven recommendations tailored to each campaign's specific goals and constraints."\n}\n\nIMPORTANT REQUIREMENTS FOR SYSTEM PROMPT:\n\n**The systemPrompt must be comprehensive and professional (400-600 words, MAX 1200 words to stay under 9000 character limit). Follow these guidelines:**\n\n1. **IDENTITY & ROLE** (Opening section)\n   - Clear identity statement with expertise domain\n   - Primary role and responsibilities\n   - Value proposition to users\n   - Professional credentials or background context\n\n2. **CORE CAPABILITIES** (Detailed list)\n   - 8-12 specific capabilities with brief explanations\n   - Platform-specific expertise (if applicable)\n   - Technical and strategic skills\n   - Domain knowledge areas\n\n3. **OPERATIONAL GUIDELINES** (How the agent works)\n   - Decision-making framework\n   - Prioritization approach\n   - Quality standards\n   - Best practices the agent follows\n   - Communication style and tone\n\n4. **KNOWLEDGE BOUNDARIES** (What the agent covers)\n   - Scope of expertise\n   - Information sources and recency\n   - Areas of specialization\n   - Adjacent domains it can support\n\n5. **INTERACTION PROTOCOLS** (How to engage users)\n   - Question clarification approach\n   - Information gathering process\n   - Response structure and format\n   - Follow-up and iteration strategy\n   - Examples or templates to provide\n\n6. **CONSTRAINTS & LIMITATIONS** (Critical guardrails)\n   - What the agent will NOT do\n   - Ethical boundaries\n   - When to escalate to humans\n   - Uncertainty handling\n   - Compliance and legal considerations\n\n7. **OUTPUT QUALITY** (Deliverable standards)\n   - Specificity and actionability requirements\n   - Data and evidence usage\n   - Structured vs. conversational responses\n   - Follow-up recommendations\n\n8. **DOMAIN-SPECIFIC EXPERTISE** (For marketing agents)\n   - Platform knowledge (Meta, Google, TikTok, Pinterest, LinkedIn)\n   - Campaign lifecycle understanding\n   - Analytics and optimization frameworks\n   - Creative strategy principles\n   - Budget management approaches\n   - Audience targeting methodologies\n   - Performance benchmarks and KPIs\n   - A/B testing and experimentation\n   - Funnel optimization tactics\n   - Attribution and measurement\n\n**TONE & STYLE:** Professional, confident, consultative, data-driven, actionable\n\n**FORMAT:** Use newline characters (\\n\\n) to create well-structured sections. Use bullet points (-) for lists.\n\nOTHER REQUIREMENTS:\n1. Return ONLY the JSON object, nothing else\n2. Include 4-5 knowledge bases\n3. Make each knowledge base description detailed (200-400 words) with specific topics, guidelines, and examples\n4. The description field will be used as the actual knowledge base content\n5. Create a descriptive agentName (3-5 words) that reflects the agent's purpose\n6. Provide modelReasoning explaining why you chose that specific model, temperature, and maxToolsIterations\n7. Set maxToolsIterations (0-10) based on agent complexity: 0 for simple Q&A, 2-5 for standard agents, 5-10 for complex data/search agents\n8. Ensure the systemPrompt follows ALL the guidelines above for a comprehensive prompt (400-600 words, MAX 1200 words)
9. CRITICAL: The systemPrompt MUST NOT exceed 9000 characters. Keep it concise and under this limit.`;

        const aiResponse = await claudeAPI.sendMessage(prompt, []);  // Don't include chat history for cleaner JSON response

        // Check if generation was cancelled
        if (generationCancelled) {
            console.log('⚠️ Generation cancelled by user');
            removeTypingIndicator();
            addChatMessage('assistant', '❌ Generation cancelled. You can try again when ready.');
            // Restore buttons
            if (generateBtn) generateBtn.style.display = 'block';
            if (cancelBtn) cancelBtn.style.display = 'none';
            return;
        }

        console.log('🔍 AI Response for parsing:', aiResponse.substring(0, 200));

        // Try to parse JSON from response - look for JSON block
        let jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (!jsonMatch) {
            // Try without code block
            jsonMatch = aiResponse.match(/(\{[\s\S]*\})/);
        }

        if (!jsonMatch) {
            console.error('❌ Could not find JSON in response:', aiResponse);
            throw new Error('AI did not return valid JSON. Using fallback generation.');
        }

        const jsonString = jsonMatch[1] || jsonMatch[0];
        console.log('📝 Extracted JSON:', jsonString.substring(0, 200));

        const config = JSON.parse(jsonString);

        // Detect domain
        const domain = config.domain || 'custom';
        agentConfig.domain = domain;

        // Set agent name from AI suggestion
        if (config.agentName) {
            agentConfig.agentName = config.agentName;
            console.log(`✅ Agent Name: "${config.agentName}"`);
        }

        // Generate knowledge bases from AI suggestions
        if (config.knowledgeBases && config.knowledgeBases.length > 0) {
            knowledgeBases = [];
            kbCounter = 0;
            config.knowledgeBases.forEach(kb => {
                addKnowledgeBase(kb.name, kb.description || 'AI-generated knowledge base');
            });
        } else {
            // Fallback to domain-based generation
            generateKnowledgeBases(domain);
        }

        // Generate outputs from AI suggestions
        if (config.outputs && config.outputs.length > 0) {
            outputs = [];
            outputCounter = 0;
            config.outputs.forEach(output => {
                outputCounter++;
                const newOutput = {
                    id: `output-${outputCounter}`,
                    outputName: sanitizeFunctionName(output.outputName || ''),
                    functionName: sanitizeFunctionName(output.functionName || ''),
                    functionDescription: output.functionDescription || '',
                    outputType: output.outputType || 'custom',
                    artifactType: output.artifactType || 'text',
                    jsonSchema: output.jsonSchema || '',
                    // Custom fields for editing
                    customFunctionName: sanitizeFunctionName(output.functionName || ''),
                    customFunctionDescription: output.functionDescription || '',
                    customJsonSchema: output.jsonSchema || ''
                };
                outputs.push(newOutput);
            });
            console.log(`✅ Generated ${outputs.length} outputs from AI`);
        }

        // Generate project configuration
        generateProjectConfig(domain);

        // Generate agent configuration with AI suggestions
        if (config.model) {
            const modelSelect = document.getElementById('modelSelect');
            if (modelSelect) {
                // Check if the AI-suggested model exists in the dropdown
                const modelExists = Array.from(modelSelect.options).some(opt => opt.value === config.model);

                if (modelExists) {
                    agentConfig.model = config.model;
                    modelSelect.value = config.model;
                    console.log(`✅ AI Model: ${config.model}`);
                } else {
                    // AI suggested a model not in our dropdown - use default
                    console.warn(`⚠️ AI suggested model "${config.model}" not found in dropdown, using default`);
                    const defaultModel = 'anthropic.claude-4.5-sonnet';
                    agentConfig.model = defaultModel;
                    modelSelect.value = defaultModel;
                    console.log(`✅ AI Model (fallback): ${defaultModel}`);
                }
            } else {
                agentConfig.model = config.model;
                console.log(`✅ AI Model: ${config.model}`);
            }
        }
        if (config.temperature !== undefined) {
            agentConfig.temperature = config.temperature;
            console.log(`✅ Temperature: ${config.temperature}`);
            // Populate temperature slider and input
            const tempSlider = document.getElementById('temperature');
            const tempInput = document.getElementById('temperatureInput');
            if (tempSlider) {
                tempSlider.value = config.temperature;
            }
            if (tempInput) {
                tempInput.value = config.temperature;
            }
        }
        if (config.maxToolsIterations !== undefined) {
            agentConfig.maxToolsIterations = config.maxToolsIterations;
            console.log(`✅ Max Tools Iterations: ${config.maxToolsIterations}`);
            // Populate maxToolsIterations slider and input
            const maxToolsIterationsSlider = document.getElementById('maxToolsIterations');
            const maxToolsIterationsInput = document.getElementById('maxToolsIterationsInput');
            if (maxToolsIterationsSlider) {
                maxToolsIterationsSlider.value = config.maxToolsIterations;
            }
            if (maxToolsIterationsInput) {
                maxToolsIterationsInput.value = config.maxToolsIterations;
            }
        }
        if (config.modelReasoning) {
            agentConfig.modelReasoning = config.modelReasoning;
            console.log(`✅ Model Reasoning: "${config.modelReasoning.substring(0, 60)}..."`);
            // Show model reasoning section
            const reasoningSection = document.getElementById('modelReasoningSection');
            const reasoningText = document.getElementById('modelReasoningText');
            if (reasoningText) {
                reasoningText.textContent = config.modelReasoning;
            }
            if (reasoningSection) {
                reasoningSection.style.display = 'block';
            }
        }
        if (config.systemPrompt) {
            // Truncate if over limit
            const truncatedPrompt = truncateSystemPrompt(config.systemPrompt);
            agentConfig.systemPrompt = truncatedPrompt;
            console.log(`✅ System Prompt: ${truncatedPrompt.length} characters`);
            // Populate the textarea
            const systemPromptTextarea = document.getElementById('systemPrompt');
            if (systemPromptTextarea) {
                systemPromptTextarea.value = truncatedPrompt;
                updateSystemPromptCharCount(); // Update character counter
            }
        }

        // If no system prompt from AI, generate it based on domain
        if (!config.systemPrompt) {
            generateSystemPrompt(domain);
        }

        // If model/temp not provided by AI, use defaults
        if (!config.model || config.temperature === undefined) {
            generateAgentConfig(domain);
        }

        // Track AI generation end time and estimate tokens
        wizardStats.aiGenerationEndTime = Date.now();
        const aiDuration = ((wizardStats.aiGenerationEndTime - wizardStats.aiGenerationStartTime) / 1000).toFixed(2);

        // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
        const estimatedInputTokens = Math.ceil(prompt.length / 4);
        const estimatedOutputTokens = Math.ceil(aiResponse.length / 4);
        wizardStats.inputTokens += estimatedInputTokens;
        wizardStats.outputTokens += estimatedOutputTokens;
        wizardStats.totalTokensUsed = wizardStats.inputTokens + wizardStats.outputTokens;

        // Estimate cost (TD LLM pricing: $3/MTok input, $15/MTok output)
        const inputCost = (wizardStats.inputTokens / 1000000) * 3;
        const outputCost = (wizardStats.outputTokens / 1000000) * 15;
        wizardStats.estimatedCost = inputCost + outputCost;

        console.log(`📊 AI generation completed in ${aiDuration}s`);
        console.log(`📊 Estimated tokens - Input: ${estimatedInputTokens}, Output: ${estimatedOutputTokens}`);
        console.log(`📊 Total tokens used: ${wizardStats.totalTokensUsed.toLocaleString()}`);
        console.log(`📊 Estimated cost: $${wizardStats.estimatedCost.toFixed(4)}`);

        removeTypingIndicator();
        stopGenerationTimer(true);

        // Clear attachment after successful generation (silent to avoid toast notification)
        clearAttachment(true);

        // Restore buttons
        if (generateBtn) generateBtn.style.display = 'block';
        if (cancelBtn) cancelBtn.style.display = 'none';

        // Show success message
        addChatMessage('assistant', `✅ <strong>${getTranslation('success.generated')}</strong><br><br>
        ${getTranslation('success.created')}<br>
        • ${knowledgeBases.length} ${getTranslation('success.kb.count')}<br>
        • ${getTranslation('success.project.config')}<br>
        • ${getTranslation('success.agent.settings')}<br><br>
        ${getTranslation('success.next.step')}`);

        // Move to next step
        setTimeout(() => {
            nextStep();
        }, 1500);

    } catch (error) {
        console.error('❌ Auto-generate error:', error);
        removeTypingIndicator();
        stopGenerationTimer(false);

        // Clear attachment after failed generation (silent to avoid toast notification)
        clearAttachment(true);

        // Restore buttons
        if (generateBtn) generateBtn.style.display = 'block';
        if (cancelBtn) cancelBtn.style.display = 'none';

        // Determine error type and provide helpful message
        let errorMessage = '';
        let errorDetails = '';

        if (error.message.includes('valid JSON')) {
            errorMessage = 'The AI response was not in the expected format.';
            errorDetails = 'This can happen occasionally. Please try again.';
        } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error - could not reach the AI service.';
            errorDetails = 'Check your internet connection and ensure the proxy server is running.';
        } else if (error.message.includes('401') || error.message.includes('403') || error.message.includes('unauthorized')) {
            errorMessage = 'Authentication error.';
            errorDetails = 'Check your API key in the API Settings.';
        } else if (error.message.includes('429') || error.message.includes('rate')) {
            errorMessage = 'Rate limit exceeded.';
            errorDetails = 'Please wait a moment before trying again.';
        } else if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
            errorMessage = 'The AI service is temporarily unavailable.';
            errorDetails = 'Please try again in a few moments.';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Request timed out.';
            errorDetails = 'The AI service took too long to respond. Please try again.';
        } else {
            errorMessage = 'AI generation failed.';
            errorDetails = error.message || 'An unexpected error occurred.';
        }

        // Show error message in chat with retry options
        addChatMessage('assistant', `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                <div class="flex items-start gap-3">
                    <span class="text-2xl">❌</span>
                    <div class="flex-1">
                        <p class="font-semibold text-red-900 mb-1">${errorMessage}</p>
                        <p class="text-sm text-red-700 mb-3">${errorDetails}</p>
                        <div class="flex flex-wrap gap-2">
                            <button onclick="autoGenerateAgent()" class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors">
                                🔄 Retry Generation
                            </button>
                            <button onclick="document.getElementById('apiKeyModal').classList.remove('hidden'); testApiConnection();" class="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 px-4 rounded-lg transition-colors">
                                ⚙️ Check API Settings
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);

        // Also show a toast notification
        showToast('error', errorMessage);
    }
}

// Generate Knowledge Bases based on domain
function generateKnowledgeBases(domain) {
    const kbTemplates = {
        hr: [
            {
                name: 'Company HR Policies',
                content: `# Company HR Policies

## Employment Policies

### Equal Employment Opportunity
Our company is committed to equal employment opportunity and does not discriminate based on race, color, religion, sex, national origin, age, disability, or any other protected characteristic.

### Code of Conduct
All employees are expected to:
- Maintain professional behavior at all times
- Respect colleagues and maintain a harassment-free workplace
- Protect company confidential information
- Follow all company policies and procedures

### Work Hours and Attendance
- Standard work hours: 9:00 AM - 5:00 PM, Monday-Friday
- Flexible work arrangements available with manager approval
- Remote work policy: Up to 2 days per week for eligible positions
- Attendance expectations and time-off request procedures

### Performance Management
- Annual performance reviews
- Quarterly check-ins with managers
- Goal-setting and development planning
- Performance improvement plans when needed

### Workplace Safety
- Report all safety concerns immediately
- Emergency evacuation procedures
- Workplace violence prevention
- Health and wellness programs

(Note: This is a template. Replace with your actual company policies.)`
            },
            {
                name: 'Employee Benefits Guide',
                content: `# Employee Benefits Guide

## Health Insurance

### Medical Coverage
- PPO and HMO plan options
- Coverage begins first day of employment
- Employee + Family coverage available
- Annual enrollment period: November

### Dental Insurance
- Preventive care covered at 100%
- Basic procedures at 80%
- Major procedures at 50%
- Orthodontia coverage available

### Vision Insurance
- Annual eye exams covered
- Allowance for frames/lenses or contacts
- Discounts on LASIK procedures

## Retirement Benefits

### 401(k) Plan
- Immediate eligibility
- Company match: 50% of first 6% contributed
- Vesting schedule: 3-year graded vesting
- Investment options and advisor access

## Paid Time Off

### Vacation Time
- Year 1: 10 days
- Years 2-5: 15 days
- Years 6+: 20 days
- Accrued monthly

### Sick Leave
- 10 days per year
- Unused days roll over (max 40 days)

### Holidays
- 10 company-paid holidays per year
- Floating holiday option

### Parental Leave
- 12 weeks paid parental leave
- Available to all new parents
- Can be taken within first year

## Additional Benefits
- Life insurance and AD&D
- Short and long-term disability
- Employee Assistance Program (EAP)
- Tuition reimbursement
- Gym membership discounts
- Commuter benefits

(Note: This is a template. Replace with your actual benefits information.)`
            },
            {
                name: 'Time Off Procedures',
                content: `# Time Off Request Procedures

## How to Request Time Off

### Vacation Time
1. Submit request at least 2 weeks in advance
2. Use company HR portal or submit to manager
3. Await manager approval
4. Receive confirmation email
5. Add to team calendar

### Sick Leave
1. Notify manager as soon as possible
2. No advance approval needed for illness
3. Medical documentation required for 3+ consecutive days
4. Update time-off system upon return

### Personal Days
1. Request at least 1 week in advance when possible
2. Subject to manager approval
3. Limited to 3 personal days per year

## Time Off Calendar

### Peak Blackout Periods
- End of fiscal quarter (3 days before/after close)
- Annual conference week
- Product launch periods

### Holiday Schedule
Refer to annual holiday calendar for company-observed holidays.

## Unused Time Off
- Vacation time: Rolls over up to 5 days per year
- Sick leave: Rolls over indefinitely (max 40 days)
- Personal days: Use it or lose it annually

## Time Off Approval Process
- Requests reviewed within 48 hours
- Approvals based on business needs and team coverage
- Denied requests: Manager will suggest alternative dates

(Note: This is a template. Customize for your company's procedures.)`
            },
            {
                name: 'Performance Review Process',
                content: `# Performance Review Process

## Annual Performance Reviews

### Timeline
- Review period: January - December
- Self-assessments due: First week of January
- Manager reviews due: Mid-January
- Review meetings: End of January
- Compensation changes effective: March 1st

### Review Components

**Self-Assessment**
- Accomplishments and key projects
- Goal achievement (previous year)
- Challenges and learning experiences
- Development areas
- Career aspirations

**Manager Assessment**
- Performance against goals
- Core competency evaluation
- Behavioral feedback
- Strengths and development areas
- Rating assignment

**360-Degree Feedback** (for senior roles)
- Peer feedback
- Stakeholder input
- Cross-functional collaboration

### Performance Ratings
1. Exceeds Expectations (Top 10%)
2. Meets All Expectations (70%)
3. Meets Most Expectations (15%)
4. Needs Improvement (5%)

### Review Meeting
- 60-minute discussion with manager
- Review accomplishments and feedback
- Discuss development opportunities
- Set goals for upcoming year
- Address questions and concerns

## Goal Setting

### SMART Goals Framework
- Specific
- Measurable
- Achievable
- Relevant
- Time-bound

### Quarterly Check-ins
- Review progress on annual goals
- Adjust goals if priorities change
- Discuss development and support needs
- Provide ongoing feedback

## Performance Improvement Plans (PIP)
- 30, 60, or 90-day plans
- Clear expectations and metrics
- Regular check-ins with manager
- HR support and resources
- Successful completion or separation decision

(Note: This is a template. Adapt to your organization's process.)`
            }
        ],
        support: [
            {
                name: 'Product Documentation',
                content: `# Product Documentation

## Product Overview

### What is [Your Product]?
[Your Product] is a comprehensive solution designed to help [target users] achieve [key benefits].

### Key Features
1. **Feature 1:** Description and benefits
2. **Feature 2:** Description and benefits
3. **Feature 3:** Description and benefits
4. **Feature 4:** Description and benefits

### System Requirements
- Operating System: Windows 10+, macOS 11+, Linux
- Browser: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- RAM: 4GB minimum, 8GB recommended
- Storage: 500MB available space

## Getting Started

### Installation
1. Download installer from [website]
2. Run setup wizard
3. Accept license agreement
4. Choose installation directory
5. Complete installation
6. Launch application

### Account Setup
1. Create account with email
2. Verify email address
3. Complete profile
4. Set preferences
5. Start using the product

### Basic Navigation
- Dashboard: Overview of your account
- Menu: Access key features
- Settings: Customize your experience
- Help: Access support resources

## Core Functionality

### Using [Key Feature 1]
1. Step-by-step instructions
2. Tips and best practices
3. Common use cases
4. Advanced options

### Using [Key Feature 2]
1. Step-by-step instructions
2. Tips and best practices
3. Common use cases
4. Advanced options

(Note: Replace with your actual product documentation.)`
            },
            {
                name: 'Troubleshooting Guide',
                content: `# Troubleshooting Guide

## Common Issues and Solutions

### Login Problems

**Issue: Can't log in**
1. Verify email and password are correct
2. Check Caps Lock is off
3. Clear browser cache and cookies
4. Try "Forgot Password" option
5. Contact support if issue persists

**Issue: Account locked**
- Wait 30 minutes after 5 failed attempts
- Use "Forgot Password" to reset
- Contact support for immediate unlock

### Performance Issues

**Issue: Application running slowly**
1. Close other applications
2. Check internet connection speed
3. Clear application cache
4. Update to latest version
5. Restart application/computer

**Issue: Features not loading**
1. Refresh the page (F5)
2. Check internet connection
3. Disable browser extensions
4. Try different browser
5. Clear browser data

### Error Messages

**Error: "Connection Failed"**
- Check internet connectivity
- Verify firewall settings
- Restart router/modem
- Try different network
- Contact IT if on corporate network

**Error: "Session Expired"**
- Click "Login Again"
- Clear cookies and re-login
- Check system time is correct

### Data Sync Issues

**Issue: Changes not saving**
1. Check internet connection
2. Verify you're logged in
3. Wait 30 seconds and refresh
4. Check storage quota
5. Contact support if data lost

(Note: Customize for your specific product issues.)`
            },
            {
                name: 'FAQ Database',
                content: `# Frequently Asked Questions

## Account and Billing

**Q: How do I update my payment method?**
A: Go to Settings > Billing > Payment Methods. Click "Add Payment Method" or "Edit" existing method.

**Q: Can I cancel my subscription?**
A: Yes, go to Settings > Subscription > Cancel Subscription. You'll have access until the end of your billing period.

**Q: What's your refund policy?**
A: We offer a 30-day money-back guarantee for new customers. Contact support to request a refund.

**Q: How do I upgrade/downgrade my plan?**
A: Settings > Subscription > Change Plan. Upgrades are immediate; downgrades take effect next billing cycle.

## Product Usage

**Q: Is there a mobile app?**
A: Yes, available for iOS and Android. Download from App Store or Google Play.

**Q: Can I use this offline?**
A: Limited offline functionality is available. Full features require internet connection.

**Q: How many users can I have?**
A: Depends on your plan:
- Basic: 1 user
- Professional: 5 users
- Enterprise: Unlimited users

**Q: Is my data backed up?**
A: Yes, automatic backups every 24 hours with 30-day retention. Enterprise plans include real-time backup.

## Technical Questions

**Q: What browsers are supported?**
A: Chrome, Firefox, Safari, and Edge (latest 2 versions). Internet Explorer is not supported.

**Q: Do you have an API?**
A: Yes, API documentation available at [api-docs-url]. API access included with Professional plans and above.

**Q: Is the data encrypted?**
A: Yes, data encrypted in transit (TLS 1.3) and at rest (AES-256).

(Note: Replace with your actual FAQs.)`
            },
            {
                name: 'Escalation Procedures',
                content: `# Support Escalation Procedures

## When to Escalate

### Tier 1 → Tier 2 Escalation
Escalate when:
- Issue requires deeper technical knowledge
- Problem persists after standard troubleshooting
- Customer requests supervisor/specialist
- Issue involves billing discrepancies
- Time spent exceeds 30 minutes

### Tier 2 → Tier 3 Escalation
Escalate when:
- Issue requires engineering investigation
- Bug affects multiple customers
- Feature request needs product team review
- Security concern identified
- Data recovery needed

### Emergency Escalation
Immediate escalation for:
- Service outage affecting all users
- Security breach or vulnerability
- Data loss or corruption
- Payment processing failure
- Legal or compliance issue

## Escalation Process

### Standard Escalation
1. Document all troubleshooting steps taken
2. Gather diagnostic information
3. Create escalation ticket
4. Assign to appropriate team
5. Notify customer of escalation
6. Set expectations for response time

### Information to Include
- Customer account details
- Detailed problem description
- Steps already attempted
- Error messages/screenshots
- Impact and urgency level
- Customer contact preference

### Follow-up Requirements
- Check escalated ticket status daily
- Update customer every 24-48 hours
- Notify customer when resolved
- Request feedback after resolution

## Response Time SLAs

### Priority Levels
- **Critical:** 1 hour response, 4 hour resolution target
- **High:** 4 hour response, 24 hour resolution target
- **Medium:** 24 hour response, 3 day resolution target
- **Low:** 48 hour response, 5 day resolution target

## After-Hours Support
- Phone support available 24/7 for Enterprise customers
- Email support monitored within 24 hours
- Emergency pager for critical issues

(Note: Customize for your support structure.)`
            }
        ],
        it: [
            {
                name: 'System Setup Guides',
                content: `# System Setup Guides

## Windows Workstation Setup

### Initial Configuration
1. **Install Windows Updates**
   - Open Settings > Update & Security
   - Check for updates
   - Install all critical and security updates
   - Restart as needed

2. **Configure User Account**
   - Create standard user account (not admin)
   - Set strong password (12+ characters)
   - Enable password expiration
   - Configure account recovery options

3. **Install Security Software**
   - Install company-approved antivirus
   - Configure real-time protection
   - Schedule weekly scans
   - Enable automatic updates

4. **Network Configuration**
   - Connect to corporate WiFi
   - Map network drives
   - Configure VPN if remote
   - Test connectivity

### Software Installation
- Microsoft Office 365
- Web browsers (Chrome, Firefox)
- Communication tools (Slack, Teams)
- Development tools (if applicable)
- Required line-of-business applications

## macOS Workstation Setup

### Initial Configuration
1. **System Updates**
   - Open System Preferences > Software Update
   - Install all available updates
   - Restart if required

2. **User Account**
   - Create managed user account
   - Enable FileVault disk encryption
   - Set up Touch ID / password
   - Configure iCloud (if approved)

3. **Security Settings**
   - Enable Firewall
   - Configure Gatekeeper
   - Install approved security software
   - Enable automatic updates

4. **Network Setup**
   - Connect to corporate WiFi
   - Configure VPN settings
   - Map shared drives
   - Test access to resources

(Note: Customize for your IT environment and standards.)`
            },
            {
                name: 'Software Installation Procedures',
                content: `# Software Installation Procedures

## Approved Software List

### Required Software (All Users)
- Antivirus: [Company Standard]
- VPN Client: [Company VPN]
- Microsoft Office 365
- Web browsers (Chrome, Firefox)
- Communication: Microsoft Teams/Slack

### Approved Optional Software
- Adobe Acrobat Reader
- 7-Zip/WinRAR
- Notepad++
- VideoLAN VLC Player
- Zoom

### Department-Specific Software
**Development Team:**
- Visual Studio Code
- Git
- Docker Desktop
- Postman
- Node.js/Python/Java

**Design Team:**
- Adobe Creative Suite
- Figma Desktop
- Sketch

## Installation Process

### Standard Installation
1. **Check Approval**
   - Verify software on approved list
   - Confirm license availability
   - Check system requirements

2. **Download Software**
   - Use official website only
   - Verify digital signature
   - Scan with antivirus before installing

3. **Install**
   - Run installer as administrator (if needed)
   - Choose corporate installation options
   - Decline additional bundled software
   - Restart if required

4. **Configure**
   - Apply company settings
   - Connect to license server
   - Set auto-update preferences
   - Test functionality

### Software Request Process
1. Submit request via IT service desk
2. Include business justification
3. Await manager approval
4. IT reviews for security/compatibility
5. License procurement (if needed)
6. Installation scheduled

## Prohibited Software
- Unauthorized file sharing applications
- Cryptocurrency mining software
- Unlicensed or pirated software
- Personal storage sync tools (Dropbox, etc.)
- Remote access tools (TeamViewer, etc.)

(Note: Maintain current approved software list for your organization.)`
            },
            {
                name: 'Security Protocols',
                content: `# IT Security Protocols

## Password Policy

### Requirements
- Minimum 12 characters
- Include uppercase, lowercase, numbers, symbols
- No dictionary words
- No personal information
- Cannot reuse last 5 passwords
- Change every 90 days

### Best Practices
- Use password manager
- Enable multi-factor authentication (MFA)
- Never share passwords
- Use unique passwords for each account
- Avoid writing passwords down

## Multi-Factor Authentication (MFA)

### Required for:
- Email access
- VPN connections
- Cloud applications
- Administrative accounts
- Financial systems

### Setup Process
1. Install authenticator app (Microsoft/Google Authenticator)
2. Scan QR code during setup
3. Enter verification code
4. Save backup codes securely
5. Test MFA login

## Data Classification

### Public Data
- Marketing materials
- Press releases
- Public website content

### Internal Data
- Internal communications
- General business documents
- Company directories

### Confidential Data
- Customer information
- Financial records
- Employee data
- Business strategies

### Restricted Data
- Trade secrets
- Legal documents
- Security credentials
- Personally identifiable information (PII)

## Email Security

### Identifying Phishing
- Suspicious sender address
- Urgent or threatening language
- Unexpected attachments
- Requests for passwords/credentials
- Grammatical errors
- Suspicious links

### Best Practices
- Verify sender before clicking links
- Hover over links to see destination
- Don't open unexpected attachments
- Report suspicious emails to IT
- Use "Report Phishing" button

## Device Security

### Laptop/Desktop
- Enable full disk encryption
- Set screen lock timeout (10 minutes)
- Never leave device unattended
- Use cable lock in public spaces
- Report lost/stolen devices immediately

### Mobile Devices
- Set strong passcode
- Enable biometric authentication
- Install approved MDM profile
- Encrypt device storage
- Enable remote wipe capability

## Network Security

### WiFi Usage
- Only use corporate or secure networks
- Avoid public WiFi without VPN
- Verify network name before connecting
- Enable VPN on untrusted networks

### VPN Usage
- Required for all remote access
- Connect before accessing company resources
- Keep VPN client updated
- Report connection issues to IT

## Incident Reporting

### Security Incidents to Report
- Suspected malware infection
- Phishing attempts
- Lost or stolen devices
- Unauthorized access attempts
- Data breaches
- Suspicious activity

### How to Report
1. Contact IT Security immediately
2. Email: security@company.com
3. Phone: [IT Security Hotline]
4. Don't attempt to fix yourself
5. Preserve evidence

(Note: Adapt security protocols to your organization's requirements.)`
            },
            {
                name: 'Network Configuration',
                content: `# Network Configuration Guide

## Corporate WiFi Setup

### Windows Configuration
1. Click WiFi icon in system tray
2. Select corporate WiFi network
3. Enter network credentials
4. Accept certificate if prompted
5. Verify connection in Network Settings

### macOS Configuration
1. Click WiFi icon in menu bar
2. Select corporate WiFi network
3. Enter network credentials
4. Trust certificate if prompted
5. Verify connection successful

### Troubleshooting WiFi Issues
- Forget network and reconnect
- Update WiFi drivers
- Restart WiFi adapter
- Check with IT for known issues
- Verify credentials haven't expired

## VPN Configuration

### VPN Client Installation
1. Download VPN client from IT portal
2. Install with administrator privileges
3. Restart computer
4. Launch VPN application
5. Enter provided credentials

### VPN Connection
1. Open VPN client
2. Select company VPN profile
3. Enter username and password
4. Complete MFA challenge
5. Wait for "Connected" status
6. Verify IP address changed

### VPN Best Practices
- Connect VPN before accessing company resources
- Keep VPN connected during remote work
- Disconnect when finished
- Report connection drops to IT
- Update VPN client when prompted

## Network Drive Mapping

### Windows
1. Open File Explorer
2. Click "Map network drive"
3. Choose drive letter
4. Enter: \\\\fileserver\\sharename
5. Check "Reconnect at sign-in"
6. Enter credentials if prompted

### macOS
1. Open Finder
2. Go > Connect to Server
3. Enter: smb://fileserver/sharename
4. Click Connect
5. Enter credentials
6. Check "Remember password"

## Printer Setup

### Network Printer Installation
1. Open Settings > Devices > Printers
2. Click "Add printer"
3. Select network printer from list
4. Follow installation wizard
5. Print test page
6. Set as default if needed

### Common Printer Issues
- Restart print spooler service
- Update printer drivers
- Check paper and toner levels
- Verify network connectivity
- Clear print queue

(Note: Update with your specific network configuration details.)`
            }
        ],
        sales: [
            {
                name: 'Product Catalog',
                content: `# Product Catalog

## Product Line Overview

### Product Category A
**Product A1** - Entry Level Solution
- Key Features: [List 3-5 main features]
- Target Customer: Small businesses, startups
- Price Point: $X/month or $Y one-time
- Best For: [Specific use cases]

**Product A2** - Professional Solution
- Key Features: [List 3-5 main features]
- Target Customer: Growing businesses
- Price Point: $X/month or $Y one-time
- Best For: [Specific use cases]

**Product A3** - Enterprise Solution
- Key Features: [List 3-5 main features]
- Target Customer: Large organizations
- Price Point: Custom pricing
- Best For: [Specific use cases]

### Product Category B
[Similar structure for other product lines]

## Competitive Advantages

### vs. Competitor 1
- Advantage 1: [Specific benefit]
- Advantage 2: [Specific benefit]
- Advantage 3: [Specific benefit]

### vs. Competitor 2
- Advantage 1: [Specific benefit]
- Advantage 2: [Specific benefit]
- Advantage 3: [Specific benefit]

## Product Specifications

[Detailed technical specifications, system requirements, integration capabilities]

(Note: Replace with your actual product information.)`
            },
            {
                name: 'Sales Techniques',
                content: `# Sales Techniques & Best Practices

## Discovery Phase

### Effective Questions to Ask
1. "What challenges are you currently facing?"
2. "What goals are you trying to achieve?"
3. "What have you tried so far?"
4. "Who else is involved in this decision?"
5. "What's your timeline for implementing a solution?"

### Active Listening
- Let the prospect talk 70% of the time
- Take notes on pain points
- Avoid interrupting
- Reflect back what you heard
- Ask clarifying questions

## Presentation Techniques

### SPIN Selling
- **Situation:** Understand current state
- **Problem:** Identify pain points
- **Implication:** Explore consequences
- **Need-Payoff:** Show value of solution

### Features vs. Benefits
- Feature: "Our software has automated reporting"
- Benefit: "Save 10 hours per week on manual reporting"

Always lead with benefits, support with features.

## Handling Objections

### "It's too expensive"
- "I understand budget is important. Let's look at the ROI..."
- "Compared to [competitor], our solution actually costs less when you factor in..."
- "What budget were you planning for?"

### "I need to think about it"
- "I understand. What specific concerns do you have?"
- "What information would help you make a decision?"
- "What's your timeline for making a decision?"

### "We're already using [competitor]"
- "That's great! What's working well for you?"
- "What would make you consider switching?"
- "Here's how we compare..."

## Closing Techniques

### Trial Close
"If we can address [concern], would you be ready to move forward?"

### Assumptive Close
"I'll have the contract ready by Friday. Does that work for you?"

### Alternative Choice Close
"Would you prefer the monthly or annual billing option?"

(Note: Customize for your sales methodology.)`
            }
        ],
        marketing: [
            {
                name: 'Campaign Planning Fundamentals',
                content: `# Campaign Planning Fundamentals

## Campaign Strategy Framework

### 1. Define Objectives
**SMART Goals:**
- Specific: Clearly defined outcome
- Measurable: Quantifiable metrics
- Achievable: Realistic given resources
- Relevant: Aligned with business goals
- Time-bound: Specific deadline

**Example Objectives:**
- Increase brand awareness by 25% in Q2
- Generate 500 qualified leads per month
- Achieve 3% conversion rate on landing page
- Grow social media following by 10,000

### 2. Identify Target Audience

**Demographics:**
- Age range
- Gender
- Location
- Income level
- Education
- Occupation

**Psychographics:**
- Interests and hobbies
- Values and beliefs
- Lifestyle
- Pain points
- Buying behavior

**Customer Personas:**
Create 2-3 detailed personas representing ideal customers.

### 3. Choose Marketing Channels

**Digital Channels:**
- Social media (Facebook, Instagram, LinkedIn, TikTok)
- Email marketing
- Content marketing (blog, video, podcasts)
- Paid advertising (Google Ads, social ads)
- SEO/SEM
- Influencer partnerships

**Traditional Channels:**
- Print advertising
- Radio/TV
- Direct mail
- Events and trade shows
- PR and media relations

### 4. Develop Messaging

**Key Messages:**
- Unique value proposition
- Brand positioning
- Key benefits
- Call to action
- Proof points (testimonials, data)

**Tone and Voice:**
- Align with brand guidelines
- Resonate with target audience
- Consistent across channels

### 5. Create Campaign Timeline

**Pre-Launch (2-4 weeks):**
- Finalize creative assets
- Set up tracking and analytics
- Build landing pages
- Schedule content
- Brief team members

**Launch Week:**
- Activate all channels
- Monitor performance
- Respond to engagement
- Address any issues

**Active Campaign (4-8 weeks):**
- Daily monitoring
- Weekly optimization
- A/B testing
- Content refreshes
- Performance reporting

**Post-Campaign:**
- Final analysis
- ROI calculation
- Lessons learned
- Archive assets

### 6. Budget Allocation

**Recommended Distribution:**
- Creative development: 15-20%
- Media/ad spend: 50-60%
- Tools and technology: 10-15%
- Personnel/agency: 15-20%
- Contingency: 5-10%

### 7. Measurement and KPIs

**Awareness Metrics:**
- Impressions
- Reach
- Brand recall
- Share of voice

**Engagement Metrics:**
- Click-through rate (CTR)
- Social engagement rate
- Time on site
- Pages per session

**Conversion Metrics:**
- Lead generation
- Conversion rate
- Cost per acquisition (CPA)
- Return on ad spend (ROAS)

**Business Impact:**
- Revenue generated
- Customer lifetime value
- Market share growth
- Brand equity increase

(Note: Adapt framework to your industry and goals.)`
            }
        ]
    };

    const kbs = kbTemplates[domain] || kbTemplates.hr;
    knowledgeBases = [];
    kbCounter = 0;

    kbs.forEach((kb, index) => {
        kbCounter++;
        knowledgeBases.push({
            id: `kb-${kbCounter}`,
            name: kb.name,
            content: kb.content
        });
    });

    renderKnowledgeBases();
}

// Generate Project Configuration
function generateProjectConfig(domain) {
    const domainNames = {
        hr: getTranslation('domain.hr.name'),
        support: getTranslation('domain.support.name'),
        it: getTranslation('domain.it.name'),
        sales: getTranslation('domain.sales.name'),
        marketing: getTranslation('domain.marketing.name')
    };

    const domainDescriptions = {
        hr: getTranslation('domain.hr.desc'),
        support: getTranslation('domain.support.desc'),
        it: getTranslation('domain.it.desc'),
        sales: getTranslation('domain.sales.desc'),
        marketing: getTranslation('domain.marketing.desc')
    };

    agentConfig.projectName = domainNames[domain] || 'Custom AI Agent System';
    agentConfig.projectDescription = domainDescriptions[domain] || agentConfig.description;

    document.getElementById('projectName').value = agentConfig.projectName;
    document.getElementById('projectDescription').value = agentConfig.projectDescription;
}

// Generate Agent Configuration
function generateAgentConfig(domain) {
    const domainAgentNames = {
        hr: getTranslation('domain.hr.agent'),
        support: getTranslation('domain.support.agent'),
        it: getTranslation('domain.it.agent'),
        sales: getTranslation('domain.sales.agent'),
        marketing: getTranslation('domain.marketing.agent')
    };

    const domainModels = {
        hr: 'anthropic.claude-4.5-sonnet',
        support: 'openai.gpt-4o',
        it: 'anthropic.claude-4.5-sonnet',
        sales: 'anthropic.claude-4.5-sonnet',
        marketing: 'anthropic.claude-4.5-sonnet'
    };

    const domainTemperatures = {
        hr: 0.3,
        support: 0.4,
        it: 0.2,
        sales: 0.6,
        marketing: 0.7
    };

    agentConfig.name = domainAgentNames[domain] || 'AI Assistant';
    agentConfig.model = domainModels[domain];
    agentConfig.temperature = domainTemperatures[domain];

    // Populate Agent Name (check if AI already set it, otherwise use domain default)
    if (!agentConfig.agentName) {
        agentConfig.agentName = agentConfig.name;
    }
    document.getElementById('agentName').value = agentConfig.agentName;

    document.getElementById('modelSelect').value = agentConfig.model;

    // Populate temperature slider and input
    const tempSlider = document.getElementById('temperature');
    const tempInput = document.getElementById('temperatureInput');
    if (tempSlider) tempSlider.value = agentConfig.temperature;
    if (tempInput) tempInput.value = agentConfig.temperature;

    // Populate max tools iterations slider and input
    const maxToolsIterationsSlider = document.getElementById('maxToolsIterations');
    const maxToolsIterationsInput = document.getElementById('maxToolsIterationsInput');
    if (maxToolsIterationsSlider) maxToolsIterationsSlider.value = agentConfig.maxToolsIterations;
    if (maxToolsIterationsInput) maxToolsIterationsInput.value = agentConfig.maxToolsIterations;

    // Show model reasoning if AI provided it
    const reasoningSection = document.getElementById('modelReasoningSection');
    const reasoningText = document.getElementById('modelReasoningText');
    if (agentConfig.modelReasoning) {
        reasoningText.textContent = agentConfig.modelReasoning;
        reasoningSection.style.display = 'block';
    } else {
        reasoningSection.style.display = 'none';
    }

    generateSystemPrompt(domain);
    updateModelRecommendation();
}

// Generate System Prompt
function generateSystemPrompt(domain) {
    const prompts = {
        hr: getTranslation('domain.hr.prompt'),
        support: getTranslation('domain.support.prompt'),
        it: getTranslation('domain.it.prompt'),
        sales: getTranslation('domain.sales.prompt'),
        marketing: getTranslation('domain.marketing.prompt')
    };

    agentConfig.systemPrompt = truncateSystemPrompt(prompts[domain] || prompts.hr);
    document.getElementById('systemPrompt').value = agentConfig.systemPrompt;
    updateSystemPromptCharCount(); // Update character counter
}

// Regenerate System Prompt using AI based on context
async function regenerateSystemPrompt() {
    const description = agentConfig.description || '';
    const tone = agentConfig.tone || 'professional';
    const audience = agentConfig.audience || 'general users';
    const domain = agentConfig.domain || 'custom';
    const agentName = agentConfig.name || 'AI Assistant';

    if (!description) {
        showToast('⚠️ Please provide an agent description first (Step 0)', 'warning');
        return;
    }

    showTypingIndicator('Regenerating system prompt based on your context...');

    const prompt = `Generate a NEW and DIFFERENT system prompt for an AI agent with these specifications:

**Agent Name:** ${agentName}
**Domain:** ${domain}
**Description:** ${description}
**Tone:** ${tone}
**Target Audience:** ${audience}

Requirements:
1. Create a comprehensive system prompt (400-600 words, UNDER 8500 characters)
2. Make it DIFFERENT from typical prompts - use unique structure and approach
3. Clearly define the agent's role, expertise, and boundaries
4. Include specific guidelines for how to interact with users
5. Match the specified tone and audience
6. Focus on the specific domain and use case described

Output ONLY the system prompt text - no explanations, no markdown code blocks, just the prompt content.`;

    try {
        // Reset chat session for fresh context
        if (typeof tdLlmAPI !== 'undefined') {
            tdLlmAPI.resetChatSession();
        }

        wizardStats.aiApiCalls++;

        const response = await claudeAPI.sendMessage(prompt, [], (chunk, fullText) => {
            updateTypingIndicator(fullText);
        });

        removeTypingIndicator();

        if (response) {
            // Clean up the response
            let cleanedPrompt = response.trim();
            // Remove markdown code blocks if present
            cleanedPrompt = cleanedPrompt.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '').trim();

            // Truncate if needed
            const finalPrompt = truncateSystemPrompt(cleanedPrompt);
            agentConfig.systemPrompt = finalPrompt;

            const textarea = document.getElementById('systemPrompt');
            if (textarea) {
                textarea.value = finalPrompt;
                updateSystemPromptCharCount();
            }

            addChatMessage('assistant', `✅ System prompt regenerated! (${finalPrompt.length} characters)\n\nReview the new prompt in the System Prompt field above.`);
            showToast('✅ System prompt regenerated successfully!', 'success');
        }
    } catch (error) {
        removeTypingIndicator();
        console.error('Error regenerating system prompt:', error);

        // Determine error type and provide helpful message
        let errorMessage = '';
        let errorDetails = '';

        if (error.message.includes('429') || error.message.includes('rate')) {
            errorMessage = 'Rate limit exceeded.';
            errorDetails = 'Please wait a moment before trying again.';
        } else if (error.message.includes('Proxy') || error.message.includes('proxy')) {
            errorMessage = 'Proxy server connection issue.';
            errorDetails = 'Please check that the proxy server is running.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Network connection issue.';
            errorDetails = 'Please check your internet connection.';
        } else {
            errorMessage = 'Failed to regenerate system prompt.';
            errorDetails = error.message || 'An unexpected error occurred.';
        }

        showToast(`❌ ${errorMessage}`, 'error');

        // Show error with retry options instead of applying fallback
        addChatMessage('assistant', `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                <div class="flex items-start gap-3">
                    <div class="text-red-500 text-xl">⚠️</div>
                    <div class="flex-1">
                        <p class="font-medium text-red-800">${errorMessage}</p>
                        <p class="text-sm text-red-600 mt-1">${errorDetails}</p>
                        <div class="mt-4 flex gap-3">
                            <button onclick="regenerateSystemPrompt()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                </svg>
                                Retry Regeneration
                            </button>
                            <button onclick="document.getElementById('apiKeyModal').classList.remove('hidden'); updateApiModalStatus();" class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                                Check API Settings
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }
}

// Generate varied system prompt based on domain
function generateSystemPromptVariation(domain) {
    const description = agentConfig.description || '';

    // Define multiple prompt variations for each domain
    const promptVariations = {
        marketing: [
            // Variation 1: Comprehensive Strategic Marketing Advisor
            `# IDENTITY & ROLE

You are an elite Marketing Campaign Strategist and Performance Advisor with deep expertise in multi-channel digital advertising, data-driven optimization, and revenue growth strategies. You serve as a trusted strategic partner to marketing teams, combining analytical rigor with creative problem-solving to drive measurable business outcomes.

Your primary role is to help marketing professionals plan, execute, and optimize comprehensive campaigns across major advertising platforms (Meta, Google, TikTok, Pinterest, LinkedIn) while maximizing return on ad spend and achieving specific business objectives.

# CORE CAPABILITIES

Your expertise spans the full marketing lifecycle:

- **Strategic Campaign Planning**: Design comprehensive campaign strategies aligned with business goals, including objective setting, KPI definition, audience segmentation, channel selection, and budget allocation across platforms
- **Platform Mastery**: Deep knowledge of Meta Ads Manager, Google Ads, TikTok Ads, Pinterest Ads, and LinkedIn Campaign Manager, including advanced features, bidding strategies, and creative specifications
- **Audience Targeting**: Expert in building high-performance audience segments using demographic, behavioral, interest-based, lookalike, and custom audience strategies, plus retargeting and funnel-based segmentation
- **Creative Strategy**: Develop data-backed creative strategies including messaging frameworks, visual concepts, video storytelling, ad copy optimization, and format selection (Stories, Reels, Video, Carousel, Static)
- **Budget Management**: Optimize budget allocation across campaigns, ad sets, and platforms using advanced techniques like campaign budget optimization, dayparting, bid strategies, and ROAS targets
- **Performance Analytics**: Track, measure, and analyze KPIs including ROAS, CPA, CAC, LTV, conversion rates, CTR, engagement metrics, and attribution across touchpoints
- **A/B Testing & Experimentation**: Design and execute rigorous testing protocols for creative, copy, audiences, placements, and bidding strategies with statistical significance
- **Conversion Optimization**: Identify and resolve bottlenecks in the customer journey from ad click to conversion, including landing page optimization, form design, and checkout flow improvements
- **Funnel Strategy**: Build full-funnel campaigns (awareness, consideration, conversion, retention) with appropriate tactics and messaging for each stage
- **Competitive Intelligence**: Analyze competitor strategies, ad creative, positioning, and market trends to identify opportunities and gaps
- **Reporting & Communication**: Create executive-ready reports and dashboards that translate complex data into clear insights and actionable recommendations
- **Platform Updates & Innovation**: Stay current with algorithm changes, new features, policy updates, and emerging advertising trends across all platforms

# OPERATIONAL GUIDELINES

**Decision-Making Framework**: Every recommendation is grounded in data, aligned with stated business goals, and considers budget constraints, audience characteristics, and competitive dynamics. You prioritize actions by potential impact and feasibility.

**Quality Standards**: All advice is specific, actionable, and supported by rationale. You avoid generic recommendations in favor of tailored strategies based on the user's unique situation, industry, and objectives.

**Communication Style**: Professional yet approachable. You explain complex concepts clearly, use relevant examples, provide step-by-step guidance, and balance strategic thinking with tactical execution details.

**Best Practices**: You follow industry standards for campaign structure, naming conventions, tracking implementation, creative testing, and performance benchmarking. You emphasize proper measurement, attribution modeling, and incrementality testing.

# KNOWLEDGE BOUNDARIES

Your expertise covers:
- Paid advertising platforms (Meta, Google, TikTok, Pinterest, LinkedIn)
- Campaign strategy, execution, and optimization
- Digital marketing analytics and measurement
- Marketing technology and tools (ad platforms, analytics, attribution)
- Consumer psychology and persuasion principles
- Current advertising trends, formats, and best practices (knowledge current to 2025)

Adjacent areas you can support:
- Marketing funnel design and customer journey mapping
- Landing page and conversion rate optimization basics
- Email marketing and marketing automation integration
- Influencer marketing and creator partnerships
- Brand positioning and messaging frameworks

# INTERACTION PROTOCOLS

**Initial Engagement**: Begin by understanding the user's specific goal, current situation, constraints (budget, timeline, resources), target audience, and success metrics. Ask clarifying questions before providing recommendations.

**Information Gathering**: Use structured questions to collect essential details:
- What is the primary business objective? (brand awareness, lead generation, sales, app installs, etc.)
- Who is the target audience? (demographics, behaviors, pain points, desires)
- What is the available budget and timeline?
- Which platforms are currently in use or being considered?
- What has been tried before, and what were the results?
- What are the key performance targets?

**Response Structure**:
1. Acknowledge the user's goal and situation
2. Provide strategic framework or approach
3. Offer specific tactical recommendations with rationale
4. Include implementation steps when relevant
5. Suggest metrics to track and success criteria
6. Anticipate follow-up questions or next steps

**Examples & Templates**: Provide concrete examples, templates, or frameworks whenever possible (audience targeting criteria, campaign structures, creative briefs, reporting dashboards, etc.).

**Iteration & Refinement**: Encourage questions, offer to refine recommendations based on additional context, and support iterative optimization as campaigns run and data accumulates.

# CONSTRAINTS & LIMITATIONS

**What You Will NOT Do**:
- Create actual ad creative (images, videos, designs) - but you will provide detailed creative briefs and concepts
- Guarantee specific results or ROI - advertising performance depends on many variables
- Recommend unethical tactics, policy violations, or misleading practices
- Access or analyze actual account data - work with information provided by users
- Make financial investment decisions - provide marketing recommendations only
- Violate platform advertising policies or terms of service

**Ethical Boundaries**: You promote honest, transparent advertising practices. You do not support deceptive tactics, misleading claims, discriminatory targeting, or privacy violations.

**When to Escalate**: Recommend involving specialized experts for:
- Legal compliance and regulatory review (healthcare, finance, alcohol, etc.)
- Complex attribution modeling and marketing mix analysis
- Large-scale marketing technology integrations
- Advanced video production and creative development
- In-depth competitive intelligence and market research

**Uncertainty Handling**: When uncertain about platform-specific details, policy nuances, or latest feature updates, you clearly state the limitation and recommend verifying with official platform documentation or support.

# OUTPUT QUALITY STANDARDS

Every response must be:
- **Actionable**: Provide clear next steps, not just theory
- **Specific**: Include concrete numbers, platforms, tactics, and examples
- **Data-Informed**: Reference benchmarks, industry standards, or analytical frameworks
- **Structured**: Use headings, bullet points, and organized sections for clarity
- **Contextual**: Tailored to the user's stated goals, industry, and constraints
- **Complete**: Address the full scope of the question, anticipate follow-ups, and provide comprehensive guidance

When making recommendations, include:
- Clear rationale (why this approach)
- Expected outcomes and success metrics
- Implementation considerations and potential challenges
- Alternative approaches when relevant
- Resources or references for further learning

Your ultimate goal is to empower marketers to make confident, data-driven decisions that drive meaningful business results through strategic, well-executed advertising campaigns.`,

            // Variation 2: Tactical Execution Marketing Specialist
            `# IDENTITY & ROLE

You are a hands-on Marketing Campaign Specialist with deep tactical expertise in paid advertising execution, optimization, and performance improvement across major digital platforms. You excel at translating strategy into action, implementing campaigns with precision, and driving measurable results through continuous testing and refinement.

You serve as the operational expert who helps marketers build, launch, and optimize campaigns that deliver profitable growth.

# CORE CAPABILITIES

- **Campaign Setup & Structure**: Expert in building well-organized campaign hierarchies, ad sets, and ads with proper naming conventions, budget distribution, and targeting configurations across Meta, Google, TikTok, Pinterest, and LinkedIn
- **Audience Building**: Create high-performance audience segments using platform tools including Custom Audiences, Lookalikes, Interest targeting, Behavior targeting, In-market audiences, Affinity audiences, and retargeting pools
- **Creative Development**: Craft compelling ad copy, headlines, descriptions, and CTAs while providing detailed creative briefs for visual and video assets aligned with platform specifications and best practices
- **Bidding & Budget Optimization**: Implement advanced bidding strategies (target ROAS, target CPA, maximize conversions, manual bidding) and budget allocation tactics to maximize efficiency and scale
- **A/B Testing Execution**: Design and run systematic tests on creative variations, audience segments, placements, ad formats, messaging, and offers with proper test design and statistical analysis
- **Performance Monitoring**: Track real-time campaign metrics, identify trends, spot anomalies, and make data-driven adjustments to improve performance continuously
- **Optimization Tactics**: Apply proven optimization techniques including creative refresh cycles, bid adjustments, audience expansion/refinement, placement optimization, and dayparting
- **Conversion Tracking**: Implement and troubleshoot pixel tracking, conversion events, offline conversions, and attribution models to ensure accurate measurement
- **Platform Features**: Leverage advanced platform features like Dynamic Creative Optimization, automated rules, smart bidding, responsive search ads, Performance Max, and advantage+ campaigns
- **Quality Score Improvement**: Optimize for platform-specific quality metrics that reduce costs and improve ad delivery
- **Landing Page Coordination**: Ensure alignment between ad messaging and landing page experience, optimize for conversion, and implement proper UTM tracking
- **Reporting Automation**: Build custom dashboards, automated reports, and performance alerts using platform tools and third-party analytics

# OPERATIONAL GUIDELINES

You prioritize execution excellence, attention to detail, and rapid iteration. Every campaign element is built with optimization in mind from day one.

**Implementation Approach**: Follow platform best practices for account structure, start with proven frameworks, and iterate based on performance data. You emphasize quick wins while building toward long-term optimization.

**Testing Philosophy**: Test one variable at a time when learning, expand to multivariate testing when scaling. Always ensure statistical significance before declaring winners. Document all tests and learnings.

**Optimization Cadence**: Monitor performance daily, make minor adjustments as needed, evaluate major changes weekly, and report on trends and insights monthly.

# INTERACTION PROTOCOLS

Start with understanding the specific task: setting up a new campaign, optimizing existing performance, troubleshooting an issue, or implementing a test.

Provide step-by-step tactical guidance with:
1. Specific platform navigation instructions
2. Recommended settings and configurations
3. Examples of effective implementations
4. Common pitfalls to avoid
5. Success metrics to monitor

When reviewing performance, analyze key metrics first, identify the primary bottleneck, and recommend the highest-impact optimization.

# CONSTRAINTS & LIMITATIONS

You provide tactical guidance and implementation instructions but cannot:
- Access or make changes to actual ad accounts
- Create visual creative assets or video content
- Guarantee specific performance outcomes
- Recommend policy violations or prohibited tactics

For strategic planning, complex analytics, or creative production, recommend collaborating with specialized experts.

# OUTPUT QUALITY

Deliver precise, implementable instructions with:
- Exact platform settings and values
- Screenshot references when helpful
- Expected results and monitoring approach
- Troubleshooting guidance
- Next steps and follow-up actions

Your focus is helping marketers execute flawlessly and optimize continuously for maximum campaign performance.`,

            // Variation 3: Analytical Performance Marketing Expert
            `# IDENTITY & ROLE

You are a Marketing Analytics and Performance Optimization Expert specializing in data-driven campaign analysis, measurement strategy, and conversion improvement. You excel at translating complex marketing data into clear insights and actionable optimization strategies that drive measurable business growth.

You serve as the analytical partner who helps marketers understand what's working, why it's working, and how to do more of it.

# CORE CAPABILITIES

- **Performance Diagnostics**: Analyze campaign data across Meta, Google, TikTok, Pinterest, and LinkedIn to identify performance drivers, bottlenecks, and optimization opportunities in targeting, creative, bidding, or funnel conversion
- **Metric Mastery**: Expert in calculating, tracking, and interpreting key performance indicators including ROAS, ROI, CPA, CAC, LTV, LTV:CAC ratio, conversion rate, CTR, engagement rate, frequency, and attribution metrics
- **Attribution Modeling**: Understand multi-touch attribution, incrementality testing, media mix modeling, and how to allocate credit across channels and touchpoints in complex customer journeys
- **Funnel Analysis**: Map and analyze the complete customer journey from impression to conversion, identifying drop-off points and conversion rate optimization opportunities at each stage
- **Cohort & Segment Analysis**: Break down performance by audience segments, time periods, platforms, campaigns, and other dimensions to uncover patterns and insights
- **Statistical Analysis**: Apply statistical methods to test results including significance testing, confidence intervals, correlation analysis, and regression to ensure data-driven decisions
- **Competitive Benchmarking**: Compare performance against industry benchmarks, competitor metrics, and historical baselines to contextualize results and set realistic targets
- **Reporting & Visualization**: Create clear, compelling reports and dashboards that communicate performance stories to executives, stakeholders, and team members
- **Testing Design**: Structure A/B tests and multivariate experiments with proper controls, sample sizes, and statistical rigor to generate valid, actionable insights
- **Forecasting & Planning**: Project future performance based on historical trends, seasonal patterns, and planned changes to support budget planning and goal setting
- **ROI Modeling**: Build models to estimate return on investment for different budget scenarios, channel mixes, and strategic approaches
- **Data Integration**: Connect insights across advertising platforms, web analytics, CRM systems, and business intelligence tools for holistic analysis

# OPERATIONAL GUIDELINES

**Analytical Framework**: Always start with clear questions or hypotheses, gather relevant data, analyze systematically, draw evidence-based conclusions, and translate findings into specific recommendations.

**Data Quality**: Ensure measurement accuracy first. Validate tracking implementation, check for data discrepancies, and confirm metrics are calculated consistently before drawing conclusions.

**Insight Generation**: Look beyond surface-level metrics to understand causal relationships, identify true drivers of performance, and separate correlation from causation.

**Communication**: Present complex data in accessible ways using visualizations, clear narratives, and executive summaries that highlight key takeaways and recommended actions.

# INTERACTION PROTOCOLS

**Analysis Requests**: Clarify what specific question needs answering, what data is available, what time period to analyze, and what decision will be made based on the findings.

**Diagnostic Process**:
1. Review overall performance against goals
2. Segment data to identify patterns
3. Compare across dimensions (time, platform, audience, creative)
4. Identify outliers and anomalies
5. Form hypotheses about drivers
6. Test hypotheses with data
7. Recommend specific optimizations

**Reporting Approach**: Structure insights in order of business impact, provide context and benchmarks, include visual aids, and always connect findings to actionable next steps.

# CONSTRAINTS & LIMITATIONS

You work with data provided by users and cannot:
- Access actual ad accounts or analytics platforms
- Pull real-time data or run custom reports
- Guarantee future performance predictions
- Make causal claims without proper experimental design

For advanced analytics needs (marketing mix modeling, econometric analysis, predictive modeling), recommend specialized data science resources.

# OUTPUT QUALITY

Every analysis includes:
- **Key Findings**: Top 3-5 most important insights
- **Supporting Data**: Specific metrics, trends, and comparisons
- **Interpretation**: What the data means for the business
- **Recommendations**: Prioritized actions based on insights
- **Next Steps**: How to implement recommendations and measure impact

Ensure all metrics are clearly defined, calculations are transparent, and conclusions are supported by evidence. Present information visually when it enhances understanding.

Your goal is to empower marketers with the insights and understanding they need to make smarter, more profitable advertising decisions based on rigorous data analysis.`
        ],

        hr: [
            // Variation 1: Policy-Focused
            `You are a knowledgeable HR Assistant specializing in company policies, benefits administration, and employee support.

Your responsibilities:
- Provide accurate, up-to-date information on company policies and procedures
- Guide employees through benefits enrollment and utilization
- Assist with time off requests, approvals, and tracking
- Answer questions about compensation, performance reviews, and career development
- Support employees with HR-related questions and concerns

Your approach:
- Always cite specific policies when providing guidance
- Maintain strict confidentiality and respect employee privacy
- Use clear, empathetic communication
- Escalate sensitive matters to human HR representatives
- Provide step-by-step instructions for HR processes
- Keep responses professional yet approachable

When uncertain, acknowledge limitations and direct employees to appropriate HR resources.`,

            // Variation 2: Employee Experience Focus
            `You are an empathetic HR Support Specialist dedicated to creating positive employee experiences and resolving workplace concerns.

What you help with:
- Understanding and navigating company benefits (health, retirement, PTO)
- Clarifying policies on performance, conduct, and workplace expectations
- Processing requests for time off, schedule changes, and accommodations
- Providing information on career development and training opportunities
- Supporting employees through workplace transitions and changes

How you operate:
- Lead with empathy and understanding of employee situations
- Simplify complex HR policies into clear, actionable guidance
- Empower employees to self-serve when possible
- Know when to involve human HR professionals
- Follow up to ensure employee needs are met
- Maintain a supportive, non-judgmental tone

Your priority is helping employees feel supported, informed, and valued.`,

            // Variation 3: Procedural Focus
            `You are an efficient HR Operations Assistant focused on processes, procedures, and getting things done correctly.

Your expertise includes:
- Detailed knowledge of HR workflows and approval processes
- Step-by-step guidance through HR systems and portals
- Accurate information on deadlines, requirements, and documentation
- Efficient routing of requests to appropriate HR teams
- Tracking and following up on employee requests

Your working style:
- Provide clear, sequential instructions for completing HR tasks
- Ensure all required information is collected upfront
- Set realistic expectations for processing times
- Verify understanding before employees proceed
- Document frequent issues for knowledge base
- Streamline processes wherever possible

Help employees navigate HR procedures efficiently while ensuring compliance and accuracy.`
        ],

        support: [
            // Variation 1: Troubleshooting Focus
            `You are a skilled Customer Support Specialist with expertise in product troubleshooting, issue resolution, and customer satisfaction.

Your capabilities:
- Diagnose and resolve common product issues quickly
- Guide customers through step-by-step troubleshooting
- Provide clear explanations of product features and functionality
- Access and share relevant documentation and resources
- Escalate complex technical issues appropriately
- Ensure positive customer experiences

Your support philosophy:
- Listen carefully to understand the full problem
- Ask clarifying questions before jumping to solutions
- Provide patient, friendly guidance at the customer's pace
- Use simple language and avoid unnecessary jargon
- Verify solutions work before closing tickets
- Learn from each interaction to improve support quality

Your goal is to resolve issues efficiently while making customers feel heard and valued.`,

            // Variation 2: Product Education Focus
            `You are an expert Product Support Educator helping customers get maximum value from our products.

What you provide:
- Comprehensive product knowledge and usage guidance
- Best practices for common use cases and workflows
- Proactive tips to prevent common issues
- Educational resources tailored to customer needs
- Feature recommendations based on customer goals
- Ongoing support for product adoption and mastery

How you help:
- Teach customers how to use features effectively
- Share tips and tricks for productivity
- Recommend relevant documentation and tutorials
- Celebrate customer successes and milestones
- Anticipate questions and address them proactively
- Build customer confidence in using the product

Transform support interactions into learning opportunities that drive product adoption and satisfaction.`,

            // Variation 3: Issue Resolution Focus
            `You are a decisive Customer Support Agent specializing in rapid issue identification and resolution.

Your strengths:
- Quickly identifying root causes of customer issues
- Applying proven solutions and workarounds
- Knowing when to escalate to specialists
- Managing customer expectations clearly
- Following up to ensure complete resolution
- Documenting solutions for future reference

Your process:
- Gather essential information efficiently
- Reproduce issues when possible
- Apply systematic troubleshooting methods
- Provide temporary workarounds while investigating
- Communicate progress and timelines clearly
- Close loops with customers after resolution

Deliver fast, effective support that minimizes customer frustration and downtime.`
        ],

        it: [
            // Variation 1: Security-First
            `You are a security-conscious IT Support Specialist with expertise in system administration, security protocols, and technical troubleshooting.

Your focus areas:
- Secure system setup and configuration
- Software installation and updates
- Security best practices and compliance
- Technical troubleshooting for hardware and software
- User access management and permissions
- Network and system security

Your security-first approach:
- Verify user identity before providing support
- Prioritize security in all recommendations
- Educate users on security risks and prevention
- Follow principle of least privilege
- Document all system changes
- Escalate security incidents immediately

Balance security requirements with user productivity while maintaining a helpful, patient demeanor.`,

            // Variation 2: User Enablement Focus
            `You are a patient IT Support Guide dedicated to helping users of all technical skill levels succeed with technology.

What you support:
- System and software setup for new users
- Troubleshooting common technical issues
- Training on IT tools and applications
- Password resets and access management
- Device configuration and optimization
- Remote work technology support

Your teaching approach:
- Adapt explanations to user's technical level
- Use analogies and simple language for complex concepts
- Provide visual aids and screenshots when helpful
- Verify understanding at each step
- Build user confidence and self-sufficiency
- Create resources for common questions

Empower users to solve simple issues independently while providing excellent support for complex problems.`,

            // Variation 3: Systems Focus
            `You are a technical IT Support Engineer with deep knowledge of system architecture, software, and infrastructure.

Your technical expertise:
- System administration and configuration
- Software deployment and troubleshooting
- Network connectivity and performance
- Hardware diagnostics and repair
- Integration and compatibility issues
- Performance optimization

Your technical approach:
- Gather detailed system information before troubleshooting
- Use systematic diagnostic methods
- Provide precise, step-by-step technical instructions
- Document configurations and solutions
- Consider system-wide impacts of changes
- Escalate infrastructure issues to senior engineers

Deliver expert technical support with clear communication and thorough problem resolution.`
        ],

        sales: [
            // Variation 1: Consultative Selling
            `You are a consultative Sales Advisor focused on understanding customer needs and providing tailored solutions.

Your sales expertise:
- Discovery and needs analysis
- Solution positioning and demonstration
- Objection handling and negotiation
- Pricing and proposal development
- Relationship building and account management
- Sales process optimization

Your consultative approach:
- Ask insightful questions to uncover true needs
- Listen more than you talk
- Position solutions based on customer pain points
- Provide relevant case studies and social proof
- Address objections with empathy and data
- Focus on long-term customer success

Build trust and deliver value throughout the entire sales cycle.`,

            // Variation 2: Product Champion
            `You are an enthusiastic Product Sales Specialist with deep knowledge of our solutions and their business impact.

What you bring:
- Comprehensive product knowledge and competitive differentiation
- Industry use cases and success stories
- ROI calculations and value propositions
- Technical specification and integration details
- Pricing structures and packaging options
- Implementation and onboarding processes

Your sales style:
- Lead with benefits, support with features
- Demonstrate products in context of customer workflows
- Quantify value and business impact
- Provide specific examples and customer testimonials
- Customize presentations for each prospect
- Follow up with relevant resources and next steps

Help customers see how our products solve their specific business challenges.`,

            // Variation 3: Strategic Sales
            `You are a strategic Sales Consultant focused on complex sales cycles and enterprise deals.

Your capabilities:
- Strategic account planning and mapping
- Multi-stakeholder selling and consensus building
- Business case development and ROI modeling
- Contract negotiation and deal structuring
- Competitive positioning and differentiation
- Executive relationship management

Your strategic approach:
- Understand organizational goals and initiatives
- Identify and engage decision makers and influencers
- Build compelling business cases with financial impact
- Navigate complex approval processes
- Create win-win negotiation outcomes
- Plan for long-term account growth

Guide complex sales processes to successful closures while building lasting customer partnerships.`
        ]
    };

    // Get variations for the domain, or use marketing as default
    const variations = promptVariations[domain] || promptVariations.marketing;

    // Get current prompt to avoid showing the same one
    const currentPrompt = agentConfig.systemPrompt;

    // Filter out the current prompt if it matches exactly
    const availableVariations = variations.filter(v => v.trim() !== currentPrompt.trim());

    // If we've used all variations, use all of them
    const variationsToUse = availableVariations.length > 0 ? availableVariations : variations;

    // Pick a random variation
    const randomIndex = Math.floor(Math.random() * variationsToUse.length);
    const newPrompt = truncateSystemPrompt(variationsToUse[randomIndex]);

    // Update the config and UI
    agentConfig.systemPrompt = newPrompt;
    document.getElementById('systemPrompt').value = newPrompt;
    updateSystemPromptCharCount(); // Update character counter
}

// Update Model Recommendation
function updateModelRecommendation() {
    const modelData = {
        // Top Tier - Recommended
        'anthropic.claude-4.5-sonnet': {
            tier: 'recommended',
            icon: '✅',
            color: 'text-green-600',
            message: 'Best overall choice for most agent use cases',
            details: 'Latest balanced model with superior reasoning, reduced hallucinations, and excellent instruction-following. 200K context. Ideal for customer service, analysis, complex workflows, and content creation.',
            cost: '$3/$15 per 1M tokens',
            warning: null
        },
        'anthropic.claude-3-5-sonnet-20241022-v2:0': {
            tier: 'good',
            icon: '✔️',
            color: 'text-blue-600',
            message: 'Previous generation - still capable',
            details: 'Good reasoning and empathy, but may hallucinate more than 4.5 Sonnet. 200K context. Consider upgrading to 4.5 for better accuracy.',
            cost: '$3/$15 per 1M tokens',
            warning: null
        },
        'anthropic.claude-3-5-haiku-20241022-v1:0': {
            tier: 'recommended',
            icon: '✅',
            color: 'text-green-600',
            message: 'Best for high-volume, cost-sensitive use cases',
            details: 'Fast (<3s), cost-effective, good for simple-to-moderate complexity. Ideal for FAQ bots and data extraction.',
            cost: '$0.80/$4 per 1M tokens (75% cheaper than Sonnet)',
            warning: null
        },
        'openai.gpt-4o': {
            tier: 'recommended',
            icon: '✅',
            color: 'text-green-600',
            message: 'Strong OpenAI option with vision capabilities',
            details: 'Good general-purpose model. Excellent for structured outputs and image understanding. 128K context.',
            cost: '$2.50/$10 per 1M tokens',
            warning: null
        },

        // Good Alternatives
        'amazon.nova-pro-v1:0': {
            tier: 'alternative',
            icon: 'ℹ️',
            color: 'text-blue-600',
            message: 'Good AWS-native option with longest context (300K)',
            details: 'Cost-effective for AWS environments. Multimodal (text, image, video). Good for long document processing.',
            cost: '$0.80/$3.20 per 1M tokens',
            warning: null
        },
        'openai.gpt-4o-mini': {
            tier: 'alternative',
            icon: 'ℹ️',
            color: 'text-blue-600',
            message: 'Very fast and affordable for simple tasks',
            details: 'Best for high-volume, low-complexity queries. Sub-2 second responses. Limited reasoning capability.',
            cost: '$0.15/$0.60 per 1M tokens',
            warning: 'Not ideal for complex reasoning or nuanced responses'
        },
        'meta.llama3-1-405b-instruct-v1:0': {
            tier: 'alternative',
            icon: 'ℹ️',
            color: 'text-blue-600',
            message: 'Open-source option with strong code capabilities',
            details: 'Good for code generation and open-source preference. 128K context.',
            cost: '$2.65/$3.50 per 1M tokens',
            warning: 'Less reliable than Claude/GPT on edge cases. Slower inference.'
        },
        'mistral.mistral-large-2411-v1:0': {
            tier: 'alternative',
            icon: 'ℹ️',
            color: 'text-blue-600',
            message: 'European alternative with strong multilingual support',
            details: 'Good for EU data residency requirements. Strong multilingual capabilities, especially European languages.',
            cost: '$2/$6 per 1M tokens',
            warning: 'Smaller ecosystem than Claude/OpenAI. Not as refined for complex tasks.'
        },

        // Not Recommended
        'anthropic.claude-3-opus-20240229-v1:0': {
            tier: 'not-recommended',
            icon: '⚠️',
            color: 'text-amber-600',
            message: 'SUPERSEDED by Claude 3.5 Sonnet v2',
            details: 'Previous flagship model. Still capable but outdated.',
            cost: '$15/$75 per 1M tokens (5x more expensive than Sonnet v2)',
            warning: 'Claude 3.5 Sonnet v2 outperforms Opus on most benchmarks and costs 60% less. Only use if you have specific legacy compatibility requirements.'
        },
        'openai.gpt-4-turbo-2024-04-09': {
            tier: 'not-recommended',
            icon: '⚠️',
            color: 'text-amber-600',
            message: 'SUPERSEDED by GPT-4o',
            details: 'Older GPT-4 variant. Reliable but outdated.',
            cost: '$10/$30 per 1M tokens (2x more expensive than GPT-4o)',
            warning: 'GPT-4o is faster, better, and 50% cheaper. No reason to use GPT-4 Turbo unless you have specific compatibility needs.'
        },
        'amazon.nova-micro-v1:0': {
            tier: 'not-recommended',
            icon: '❌',
            color: 'text-red-600',
            message: 'NOT RECOMMENDED for production agents',
            details: 'Smallest Nova model. Very limited capability.',
            cost: '$0.035/$0.14 per 1M tokens (cheapest)',
            warning: 'Too basic for most agent use cases. High error rate. Poor instruction-following. Only use for extreme cost constraints with very simple classification tasks.'
        },
        'meta.llama3-1-8b-instruct-v1:0': {
            tier: 'not-recommended',
            icon: '❌',
            color: 'text-red-600',
            message: 'NOT RECOMMENDED for production agents',
            details: 'Smallest Llama model. Inconsistent quality.',
            cost: '$0.22/$0.22 per 1M tokens',
            warning: 'Too limited for real-world agents. High error rate on complex instructions. Only suitable for prototyping/testing with open-source requirement.'
        },

        // Acceptable but situational
        'amazon.nova-lite-v1:0': {
            tier: 'situational',
            icon: 'ℹ️',
            color: 'text-blue-600',
            message: 'Acceptable for simple AWS use cases',
            details: 'Fast and cost-effective on AWS. Good for simple queries only.',
            cost: '$0.06/$0.24 per 1M tokens',
            warning: 'Limited reasoning capability. Not suitable for complex agents. Use Claude Haiku instead unless locked into AWS.'
        },
        'meta.llama3-1-70b-instruct-v1:0': {
            tier: 'situational',
            icon: 'ℹ️',
            color: 'text-blue-600',
            message: 'Acceptable open-source option for moderate complexity',
            details: 'Good balance of cost/performance for open models. Faster than 405B.',
            cost: '$0.99/$0.99 per 1M tokens',
            warning: 'Can struggle with nuanced tasks. Less capable than proprietary models. Use if open-source is required.'
        },
        'mistral.mistral-small-2409-v1:0': {
            tier: 'situational',
            icon: 'ℹ️',
            color: 'text-blue-600',
            message: 'Cost-effective for simple EU projects',
            details: 'Good for simple agents with European data residency needs.',
            cost: '$0.20/$0.60 per 1M tokens',
            warning: 'Not ideal for complex agents. Use Mistral Large or Claude Haiku for better quality.'
        }
    };

    const model = document.getElementById('modelSelect').value;
    const data = modelData[model];
    const recElement = document.getElementById('modelRecommendation');
    const warningElement = document.getElementById('modelWarning');

    if (!recElement || !data) return;

    // Update recommendation message
    recElement.className = `text-xs mt-1 ${data.color}`;
    recElement.innerHTML = `<strong>${data.icon} ${data.message}</strong><br>${data.details}<br><span class="text-gray-500">Cost: ${data.cost}</span>`;

    // Update warning message
    if (warningElement) {
        if (data.warning) {
            warningElement.textContent = `⚠️ ${data.warning}`;
            warningElement.classList.remove('hidden');
        } else {
            warningElement.classList.add('hidden');
        }
    }

    // Show link to full model reference
    const linkHTML = '<br><a href="MODEL_REFERENCE.html" target="_blank" class="text-indigo-600 hover:text-indigo-700 underline text-xs font-medium">📖 View Full Model Comparison Guide</a>';
    recElement.innerHTML += linkHTML;
}

// Render Knowledge Bases in Step 1
function renderKnowledgeBases() {
    const container = document.getElementById('knowledgeBasesList');
    container.innerHTML = '';

    if (knowledgeBases.length === 0) {
        container.innerHTML = '<div class="text-center py-12 text-gray-400"><p>Complete Step 0 to generate knowledge bases</p></div>';
        return;
    }

    knowledgeBases.forEach((kb, index) => {
        const kbDiv = document.createElement('div');
        kbDiv.className = 'bg-gray-50 rounded-lg p-4 border border-gray-200';
        kbDiv.id = kb.id;

        const kbType = kb.type || 'text';
        kbDiv.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        ${getTranslation('step1.kb.title')} ${index + 1} - ${getTranslation('step1.kb.title')} <span class="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="${kb.id}-name"
                        value="${kb.name}"
                        class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <button
                    onclick="removeKnowledgeBase('${kb.id}')"
                    class="ml-3 text-red-600 hover:text-red-700 text-sm font-medium"
                >
                    ${getTranslation('button.remove')}
                </button>
            </div>

            <div class="mb-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                    Knowledge Base Type <span class="text-red-500">*</span>
                </label>
                <select
                    id="${kb.id}-type"
                    class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    onchange="handleKBTypeChange('${kb.id}')"
                >
                    <option value="text" ${kbType === 'text' ? 'selected' : ''}>📄 Text Knowledge Base</option>
                    <option value="database" ${kbType === 'database' ? 'selected' : ''}>🗄️ Database (TD Audience Data)</option>
                </select>
                <p class="text-xs text-gray-500 mt-1">
                    ${kbType === 'text' ? 'Text-based knowledge for agent expertise' : 'Connect to Treasure Data audience databases'}
                </p>
            </div>

            <div id="${kb.id}-text-fields" style="display: ${kbType === 'text' ? 'block' : 'none'};">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        ${getTranslation('step1.kb.content')} <span class="text-red-500">*</span>
                    </label>
                    <textarea
                        id="${kb.id}-content"
                        rows="8"
                        class="w-full border border-gray-300 rounded px-3 py-2 text-sm kb-editor focus:ring-2 focus:ring-indigo-500"
                    >${kb.content || ''}</textarea>
                    <div class="flex justify-between items-center mt-1">
                        <span id="${kb.id}-char-count" class="text-xs text-gray-500">${(kb.content || '').length.toLocaleString()} / 18,000 ${getTranslation('step1.kb.characters')}</span>
                        <button class="text-xs text-indigo-600 hover:text-indigo-700">${getTranslation('button.expand')}</button>
                    </div>
                </div>
            </div>

            <div id="${kb.id}-database-fields" style="display: ${kbType === 'database' ? 'block' : 'none'};">
                <div class="space-y-3">
                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <label class="block text-sm font-medium text-gray-700">
                                Database name <span class="text-red-500">*</span>
                            </label>
                            <button
                                onclick="fetchTDDatabases('${kb.id}')"
                                class="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                                title="Fetch live databases from Treasure Data"
                            >
                                🔄 Fetch from TD
                            </button>
                        </div>
                        <select
                            id="${kb.id}-database"
                            class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                            onchange="handleDatabaseChange('${kb.id}')"
                        >
                            <option value="">Select a database</option>
                            <optgroup label="💡 Click 'Fetch from TD' to load databases">
                                <option disabled>Click the "🔄 Fetch from TD" button above to load 15,000+ databases from TD1</option>
                            </optgroup>
                        </select>
                        <p class="text-xs text-gray-500 mt-1">
                            <span id="${kb.id}-database-status">Click "Fetch from TD" to load your live databases</span>
                        </p>
                    </div>

                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <label class="block text-sm font-medium text-gray-700">
                                Table
                            </label>
                            <button
                                onclick="addTableToKB('${kb.id}')"
                                class="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                                + Add Table
                            </button>
                        </div>
                        <div id="${kb.id}-tables-container" class="space-y-2">
                            <!-- Tables will be added here dynamically -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(kbDiv);

        // Add event listeners
        document.getElementById(`${kb.id}-name`).addEventListener('input', function() {
            const kbIndex = knowledgeBases.findIndex(k => k.id === kb.id);
            if (kbIndex !== -1) {
                knowledgeBases[kbIndex].name = this.value;
            }
        });

        document.getElementById(`${kb.id}-content`)?.addEventListener('input', function() {
            const kbIndex = knowledgeBases.findIndex(k => k.id === kb.id);
            if (kbIndex !== -1) {
                knowledgeBases[kbIndex].content = this.value;
            }
            updateCharCount(kb.id);
        });

        // Add database field listeners if database type
        if (kb.type === 'database') {
            document.getElementById(`${kb.id}-database`)?.addEventListener('input', function() {
                const kbIndex = knowledgeBases.findIndex(k => k.id === kb.id);
                if (kbIndex !== -1) {
                    knowledgeBases[kbIndex].database = this.value;
                }
            });

            document.getElementById(`${kb.id}-table`)?.addEventListener('input', function() {
                const kbIndex = knowledgeBases.findIndex(k => k.id === kb.id);
                if (kbIndex !== -1) {
                    knowledgeBases[kbIndex].table = this.value;
                }
            });
        }
    });
}

// Handle KB type change
function handleKBTypeChange(kbId) {
    const typeSelect = document.getElementById(`${kbId}-type`);
    const kbIndex = knowledgeBases.findIndex(k => k.id === kbId);

    if (kbIndex === -1) return;

    const newType = typeSelect.value;
    knowledgeBases[kbIndex].type = newType;

    // Add/remove database fields based on type
    if (newType === 'database') {
        knowledgeBases[kbIndex].database = knowledgeBases[kbIndex].database || '';
        knowledgeBases[kbIndex].table = knowledgeBases[kbIndex].table || '';
    } else {
        delete knowledgeBases[kbIndex].database;
        delete knowledgeBases[kbIndex].table;
        delete knowledgeBases[kbIndex].connectionString;
    }

    // Re-render to show/hide appropriate fields
    renderKnowledgeBases();

    console.log(`🔄 Changed KB "${knowledgeBases[kbIndex].name}" type to: ${newType}`);
}

// Fetch TD Databases
async function fetchTDDatabases(kbId) {
    const statusSpan = document.getElementById(`${kbId}-database-status`);
    const selectElement = document.getElementById(`${kbId}-database`);

    if (!statusSpan || !selectElement) return;

    try {
        statusSpan.textContent = '⏳ Fetching live databases from TD1 account...';
        statusSpan.className = 'text-xs text-blue-600';
        showToast('📡 Fetching live TD1 databases via MCP...', 'info');

        // Call the local proxy server which uses TD MCP
        const response = await fetch('http://localhost:3334/td/databases');
        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const databases = data.databases;

        // Clear existing options
        selectElement.innerHTML = '<option value="">Select database...</option>';

        // Add search input option group
        const searchGroup = document.createElement('optgroup');
        searchGroup.label = `🗄️ TD1 Databases (${databases.length.toLocaleString()} total)`;

        // Add all databases
        databases.forEach(db => {
            const option = document.createElement('option');
            option.value = db;
            option.textContent = db;
            searchGroup.appendChild(option);
        });

        selectElement.appendChild(searchGroup);

        // Update status
        statusSpan.textContent = `✅ Loaded ${databases.length.toLocaleString()} databases from TD1 account (live connection)`;
        statusSpan.className = 'text-xs text-green-600';
        showToast(`✅ Loaded ${databases.length.toLocaleString()} TD1 databases!`, 'success');

        // Make the select searchable by adding a data attribute
        selectElement.setAttribute('data-searchable', 'true');

        console.log(`✅ Loaded ${databases.length} databases from TD1 account via TD MCP`);

    } catch (error) {
        console.error('Error fetching TD databases:', error);
        statusSpan.textContent = '❌ Error loading databases. Make sure local proxy server is running (node local-proxy-server.js)';
        statusSpan.className = 'text-xs text-red-600';
        showToast('❌ Failed to fetch databases: ' + error.message, 'error');
    }
}

// Add table to knowledge base
function addTableToKB(kbId) {
    const container = document.getElementById(`${kbId}-tables-container`);
    const kbIndex = knowledgeBases.findIndex(k => k.id === kbId);

    if (!container || kbIndex === -1) return;

    // Initialize tables array if it doesn't exist
    if (!knowledgeBases[kbIndex].tables) {
        knowledgeBases[kbIndex].tables = [];
    }

    const tableId = `${kbId}-table-${Date.now()}`;
    const tableIndex = knowledgeBases[kbIndex].tables.length;

    // Add table to KB data
    knowledgeBases[kbIndex].tables.push({
        id: tableId,
        tableName: '',
        tdQuery: '',
        name: ''
    });

    // Create table UI
    const tableDiv = document.createElement('div');
    tableDiv.id = tableId;
    tableDiv.className = 'bg-gray-50 p-3 rounded border border-gray-200';
    tableDiv.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-700">Table ${tableIndex + 1}</span>
            <button
                onclick="removeTableFromKB('${kbId}', '${tableId}')"
                class="text-xs text-red-600 hover:text-red-700"
            >
                ⊖ Remove
            </button>
        </div>
        <div class="space-y-2">
            <div>
                <div class="flex items-center justify-between mb-1">
                    <label class="block text-xs font-medium text-gray-700">
                        Select Table <span class="text-red-500">*</span>
                    </label>
                    <button
                        onclick="fetchTablesForTable('${kbId}', '${tableId}')"
                        id="${tableId}-fetch-btn"
                        class="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        🔄 Fetch Tables
                    </button>
                </div>
                <select
                    id="${tableId}-dropdown"
                    class="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
                    onchange="handleTableSelect('${kbId}', '${tableId}')"
                >
                    <option value="">Select table...</option>
                    <optgroup label="💡 Click 'Fetch Tables' to load">
                        <option disabled>Select database first, then click "🔄 Fetch Tables"</option>
                    </optgroup>
                </select>
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">
                    TD Query <span class="text-red-500">*</span>
                </label>
                <textarea
                    id="${tableId}-query"
                    rows="3"
                    placeholder="SELECT * FROM table_name WHERE ..."
                    class="w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                    oninput="updateTableQuery('${kbId}', '${tableId}')"
                ></textarea>
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">
                    Name <span class="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    id="${tableId}-name"
                    placeholder="e.g., Customer Segments"
                    class="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
                    oninput="updateTableName('${kbId}', '${tableId}')"
                />
            </div>
        </div>
    `;

    container.appendChild(tableDiv);
}

// Remove table from knowledge base
function removeTableFromKB(kbId, tableId) {
    const tableDiv = document.getElementById(tableId);
    const kbIndex = knowledgeBases.findIndex(k => k.id === kbId);

    if (tableDiv) {
        tableDiv.remove();
    }

    if (kbIndex !== -1 && knowledgeBases[kbIndex].tables) {
        knowledgeBases[kbIndex].tables = knowledgeBases[kbIndex].tables.filter(t => t.id !== tableId);
        console.log(`🗑️ Removed table ${tableId} from KB ${kbId}`);
    }
}

// Fetch tables for a specific table entry
async function fetchTablesForTable(kbId, tableId) {
    const databaseSelect = document.getElementById(`${kbId}-database`);
    const tableDropdown = document.getElementById(`${tableId}-dropdown`);

    if (!databaseSelect || !tableDropdown) return;

    const database = databaseSelect.value;
    if (!database) {
        showToast('⚠️ Please select a database first', 'warning');
        return;
    }

    try {
        showToast(`📡 Fetching tables from ${database}...`, 'info');

        const response = await fetch(`http://localhost:3334/td/tables/${encodeURIComponent(database)}`);
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        const tables = data.tables;

        // Clear and populate dropdown
        tableDropdown.innerHTML = '<option value="">Select table...</option>';

        const tableGroup = document.createElement('optgroup');
        tableGroup.label = `📊 Tables in ${database} (${tables.length} total)`;

        tables.forEach(table => {
            const option = document.createElement('option');
            option.value = table;
            option.textContent = table;
            tableGroup.appendChild(option);
        });

        tableDropdown.appendChild(tableGroup);
        showToast(`✅ Loaded ${tables.length} tables!`, 'success');

    } catch (error) {
        console.error('Error fetching tables:', error);
        showToast('❌ Failed to fetch tables: ' + error.message, 'error');
    }
}

// Handle table selection
function handleTableSelect(kbId, tableId) {
    const tableDropdown = document.getElementById(`${tableId}-dropdown`);
    const queryTextarea = document.getElementById(`${tableId}-query`);
    const kbIndex = knowledgeBases.findIndex(k => k.id === kbId);

    if (!tableDropdown || !queryTextarea) return;

    const selectedTable = tableDropdown.value;

    // Auto-populate query with basic SELECT
    if (selectedTable && queryTextarea.value.trim() === '') {
        queryTextarea.value = `SELECT * FROM ${selectedTable} LIMIT 100`;
    }

    // Update KB data
    if (kbIndex !== -1 && knowledgeBases[kbIndex].tables) {
        const table = knowledgeBases[kbIndex].tables.find(t => t.id === tableId);
        if (table) {
            table.tableName = selectedTable;
            table.tdQuery = queryTextarea.value;
        }
    }
}

// Update table query
function updateTableQuery(kbId, tableId) {
    const queryTextarea = document.getElementById(`${tableId}-query`);
    const kbIndex = knowledgeBases.findIndex(k => k.id === kbId);

    if (kbIndex !== -1 && knowledgeBases[kbIndex].tables) {
        const table = knowledgeBases[kbIndex].tables.find(t => t.id === tableId);
        if (table) {
            table.tdQuery = queryTextarea.value;
        }
    }
}

// Update table name
function updateTableName(kbId, tableId) {
    const nameInput = document.getElementById(`${tableId}-name`);
    const kbIndex = knowledgeBases.findIndex(k => k.id === kbId);

    if (kbIndex !== -1 && knowledgeBases[kbIndex].tables) {
        const table = knowledgeBases[kbIndex].tables.find(t => t.id === tableId);
        if (table) {
            table.name = nameInput.value;
        }
    }
}

// Handle database selection change
function handleDatabaseChange(kbId) {
    const databaseSelect = document.getElementById(`${kbId}-database`);

    if (!databaseSelect) return;

    const selectedDatabase = databaseSelect.value;

    // Update KB data
    const kbIndex = knowledgeBases.findIndex(k => k.id === kbId);
    if (kbIndex !== -1) {
        knowledgeBases[kbIndex].database = selectedDatabase;
    }

    console.log(`✅ Selected database: ${selectedDatabase} for KB: ${kbId}`);
}

// Fetch TD Tables
async function fetchTDTables(kbId) {
    const databaseSelect = document.getElementById(`${kbId}-database`);
    const statusSpan = document.getElementById(`${kbId}-table-status`);
    const tableSelect = document.getElementById(`${kbId}-table`);

    if (!databaseSelect || !statusSpan || !tableSelect) return;

    const database = databaseSelect.value;
    if (!database) {
        showToast('⚠️ Please select a database first', 'warning');
        return;
    }

    try {
        statusSpan.textContent = `⏳ Fetching live tables from ${database}...`;
        statusSpan.className = 'text-xs text-blue-600';
        showToast(`📡 Fetching tables from ${database} via MCP...`, 'info');

        // Call the local proxy server which uses TD MCP
        const response = await fetch(`http://localhost:3334/td/tables/${encodeURIComponent(database)}`);
        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const tables = data.tables;

        // Clear existing options
        tableSelect.innerHTML = '<option value="">Select table...</option>';

        // Add tables
        const tableGroup = document.createElement('optgroup');
        tableGroup.label = `📊 Tables in ${database} (${tables.length.toLocaleString()} total)`;

        tables.forEach(table => {
            const option = document.createElement('option');
            option.value = table;
            option.textContent = table;
            tableGroup.appendChild(option);
        });

        tableSelect.appendChild(tableGroup);

        // Update status
        statusSpan.textContent = `✅ Loaded ${tables.length.toLocaleString()} tables from ${database} (live connection)`;
        statusSpan.className = 'text-xs text-green-600';
        showToast(`✅ Loaded ${tables.length.toLocaleString()} tables from ${database}!`, 'success');

        console.log(`✅ Loaded ${tables.length} tables from ${database} via TD MCP`);

    } catch (error) {
        console.error('Error fetching TD tables:', error);
        statusSpan.textContent = '❌ Error fetching tables. Make sure local proxy server is running.';
        statusSpan.className = 'text-xs text-red-600';
        showToast('❌ Failed to fetch tables: ' + error.message, 'error');
    }
}

// Add Knowledge Base
function addKnowledgeBase(name = '', content = '', type = 'text') {
    kbCounter++;
    const newKB = {
        id: `kb-${kbCounter}`,
        name: name,
        content: content,
        type: type || 'text', // 'text' or 'database'
        // Database-specific fields
        database: type === 'database' ? '' : undefined,
        table: type === 'database' ? '' : undefined,
        connectionString: type === 'database' ? '' : undefined
    };
    knowledgeBases.push(newKB);
    renderKnowledgeBases();

    console.log(`✅ Added KB: "${name}" (type: ${type}, ${content.length} chars)`);
}

// Remove Knowledge Base
function removeKnowledgeBase(kbId) {
    if (knowledgeBases.length <= 1) {
        alert(getTranslation('validation.kb.minimum', 'You must have at least one knowledge base!'));
        return;
    }

    knowledgeBases = knowledgeBases.filter(kb => kb.id !== kbId);
    renderKnowledgeBases();
}

// Update Character Count
function updateCharCount(kbId) {
    const textarea = document.getElementById(`${kbId}-content`);
    const counter = document.getElementById(`${kbId}-char-count`);

    if (!textarea || !counter) return;

    const count = textarea.value.length;
    counter.textContent = `${count.toLocaleString()} / 18,000 characters`;

    counter.classList.remove('text-gray-500', 'text-orange-500', 'text-red-600', 'font-bold');

    if (count > 18000) {
        counter.classList.add('text-red-600', 'font-bold');
    } else if (count > 15000) {
        counter.classList.add('text-orange-500');
    } else {
        counter.classList.add('text-gray-500');
    }
}

// ========== ADDITIONAL TOOLS FUNCTIONS (STEP 4) ==========

function addTool() {
    toolCounter++;
    const newTool = {
        id: `tool-${toolCounter}`,
        type: 'agent',
        functionName: '',
        functionDescription: '',
        targetAgent: '',
        imageFormat: 'png',
        workflowArn: '',
        outputMode: 'return'
    };
    additionalTools.push(newTool);
    renderTools();
    console.log(`✅ Added Tool: ${newTool.id}`);
}

function removeTool(toolId) {
    additionalTools = additionalTools.filter(tool => tool.id !== toolId);
    renderTools();
}

function renderTools() {
    const container = document.getElementById('additionalToolsList');
    if (!container) return;

    container.innerHTML = '';

    if (additionalTools.length === 0) {
        container.innerHTML = '<div class="text-center py-8 text-gray-400"><p>No additional tools added yet. Click "Add Tool" to get started.</p></div>';
        return;
    }

    additionalTools.forEach((tool, index) => {
        const toolDiv = document.createElement('div');
        toolDiv.className = 'bg-gray-50 rounded-lg p-4 border border-gray-200';
        toolDiv.id = tool.id;

        toolDiv.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <h4 class="text-sm font-semibold text-gray-900">Tool ${index + 1}</h4>
                <button
                    onclick="removeTool('${tool.id}')"
                    class="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                    Remove
                </button>
            </div>

            <div class="space-y-3">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Tool Type</label>
                    <select id="${tool.id}-type" class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                        <option value="agent" ${tool.type === 'agent' ? 'selected' : ''}>Agent</option>
                        <option value="image_generator" ${tool.type === 'image_generator' ? 'selected' : ''}>Image Generator</option>
                        <option value="workflow" ${tool.type === 'workflow' ? 'selected' : ''}>Workflow Executor</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Function Name</label>
                    <input type="text" id="${tool.id}-functionName" value="${tool.functionName}"
                           placeholder="e.g., create_email_draft"
                           class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Function Description</label>
                    <textarea id="${tool.id}-functionDescription" rows="2"
                              placeholder="Describe what this tool does..."
                              class="w-full border border-gray-300 rounded px-3 py-2 text-sm">${tool.functionDescription}</textarea>
                </div>

                <div id="${tool.id}-agent-fields" style="display: ${tool.type === 'agent' ? 'block' : 'none'}">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Target Agent</label>
                    <input type="text" id="${tool.id}-targetAgent" value="${tool.targetAgent}"
                           placeholder="e.g., Email_Creator_Agent"
                           class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>

                <div id="${tool.id}-image-fields" style="display: ${tool.type === 'image_generator' ? 'block' : 'none'}">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Image Format</label>
                    <select id="${tool.id}-imageFormat" class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                        <option value="png" ${tool.imageFormat === 'png' ? 'selected' : ''}>PNG</option>
                        <option value="jpeg" ${tool.imageFormat === 'jpeg' ? 'selected' : ''}>JPEG</option>
                    </select>
                </div>

                <div id="${tool.id}-workflow-fields" style="display: ${tool.type === 'workflow' ? 'block' : 'none'}">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Workflow ARN</label>
                    <input type="text" id="${tool.id}-workflowArn" value="${tool.workflowArn}"
                           placeholder="arn:aws:bedrock:..."
                           class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Output Mode</label>
                    <select id="${tool.id}-outputMode" class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                        <option value="return" ${tool.outputMode === 'return' ? 'selected' : ''}>Return (Agent processes result)</option>
                        <option value="stream" ${tool.outputMode === 'stream' ? 'selected' : ''}>Stream (Direct to user)</option>
                    </select>
                </div>
            </div>
        `;

        container.appendChild(toolDiv);

        // Add event listeners
        const typeSelect = document.getElementById(`${tool.id}-type`);
        typeSelect.addEventListener('change', function() {
            const toolIndex = additionalTools.findIndex(t => t.id === tool.id);
            if (toolIndex !== -1) {
                additionalTools[toolIndex].type = this.value;
                renderTools();
            }
        });

        ['functionName', 'functionDescription', 'targetAgent', 'imageFormat', 'workflowArn', 'outputMode'].forEach(field => {
            const element = document.getElementById(`${tool.id}-${field}`);
            if (element) {
                element.addEventListener('input', function() {
                    const toolIndex = additionalTools.findIndex(t => t.id === tool.id);
                    if (toolIndex !== -1) {
                        additionalTools[toolIndex][field] = this.value;
                    }
                });
            }
        });
    });
}

// ========== KNOWLEDGE BASE TOOLS DISPLAY (STEP 4) ==========

function renderKnowledgeBaseTools() {
    const container = document.getElementById('knowledgeBaseToolsList');
    if (!container) return;

    container.innerHTML = '';

    if (knowledgeBases.length === 0) {
        container.innerHTML = '<div class="text-center py-6 text-gray-400"><p>No knowledge bases created yet. Complete Steps 0-1 to generate knowledge bases.</p></div>';
        return;
    }

    knowledgeBases.forEach((kb, index) => {
        const toolDiv = document.createElement('div');
        toolDiv.className = 'bg-white border border-gray-200 rounded-lg p-4';
        toolDiv.id = `kb-tool-${index}`;

        // Initialize custom fields if they don't exist
        if (!kb.customToolName) {
            kb.customToolName = `kb_${kb.name.toLowerCase().replace(/\s+/g, '_')}`;
        }
        if (!kb.customToolDescription) {
            kb.customToolDescription = `Search and retrieve information from ${kb.name}`;
        }

        toolDiv.innerHTML = `
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Knowledge Base
                    </span>
                    <span class="text-sm font-semibold text-gray-900">Tool ${index + 1}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        Auto-generated
                    </span>
                    <button onclick="toggleKBToolEdit(${index})" class="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                        ✏️ Edit
                    </button>
                </div>
            </div>

            <!-- Collapsed View -->
            <div id="kb-tool-collapsed-${index}" class="space-y-2">
                <div>
                    <span class="text-xs font-medium text-gray-500">Function Name:</span>
                    <p class="text-sm text-gray-900 font-mono">${kb.customToolName}</p>
                </div>
                <div>
                    <span class="text-xs font-medium text-gray-500">Description:</span>
                    <p class="text-sm text-gray-700">${kb.customToolDescription}</p>
                </div>
                <div>
                    <span class="text-xs font-medium text-gray-500">Source Knowledge Base:</span>
                    <p class="text-sm text-gray-900">${kb.name}</p>
                </div>
            </div>

            <!-- Expanded Edit View -->
            <div id="kb-tool-expanded-${index}" class="space-y-3 hidden">
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Function Name</label>
                    <input type="text" id="kb-tool-name-${index}" value="${kb.customToolName}"
                           class="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                           onchange="updateKBToolName(${index}, this.value)" />
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Description</label>
                    <textarea id="kb-tool-desc-${index}" rows="2"
                              class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                              onchange="updateKBToolDescription(${index}, this.value)">${kb.customToolDescription}</textarea>
                </div>
                <div>
                    <span class="text-xs font-medium text-gray-500">Source Knowledge Base:</span>
                    <p class="text-sm text-gray-900">${kb.name}</p>
                </div>
                <div class="flex justify-end">
                    <button onclick="toggleKBToolEdit(${index})"
                            class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-medium">
                        Done
                    </button>
                </div>
            </div>
        `;

        container.appendChild(toolDiv);
    });

    // Add summary
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'mt-4 p-3 bg-gray-50 rounded-lg';
    summaryDiv.innerHTML = `
        <p class="text-sm text-gray-700">
            <strong>${knowledgeBases.length} Knowledge Base tool${knowledgeBases.length !== 1 ? 's' : ''}</strong> will be available to your agent.
            ${knowledgeBases.length > 0 ? 'Users can query these tools to get information from your knowledge bases.' : ''}
        </p>
    `;
    container.appendChild(summaryDiv);
}

function toggleKBToolEdit(index) {
    const collapsed = document.getElementById(`kb-tool-collapsed-${index}`);
    const expanded = document.getElementById(`kb-tool-expanded-${index}`);

    if (collapsed && expanded) {
        collapsed.classList.toggle('hidden');
        expanded.classList.toggle('hidden');
    }
}

function updateKBToolName(index, value) {
    if (knowledgeBases[index]) {
        knowledgeBases[index].customToolName = value;
        console.log(`✅ Updated KB Tool ${index} name: ${value}`);
    }
}

function updateKBToolDescription(index, value) {
    if (knowledgeBases[index]) {
        knowledgeBases[index].customToolDescription = value;
        console.log(`✅ Updated KB Tool ${index} description: ${value}`);
    }
}

// ========== OUTPUTS FUNCTIONS (STEP 5) ==========

function renderAutoGeneratedOutputs() {
    const container = document.getElementById('autoGeneratedOutputsList');
    if (!container) return;

    container.innerHTML = '';

    if (outputs.length === 0) {
        container.innerHTML = '<div class="text-center py-6 text-gray-400"><p>No outputs auto-generated yet. Complete Steps 0-1 to generate outputs.</p></div>';
        return;
    }

    outputs.forEach((output, index) => {
        const outputDiv = document.createElement('div');
        outputDiv.className = 'bg-white border border-gray-200 rounded-lg p-4';
        outputDiv.id = `auto-output-${index}`;

        // Initialize custom fields if they don't exist
        if (!output.customFunctionName) {
            output.customFunctionName = output.functionName || `generate_${output.outputName}`;
        }
        if (!output.customFunctionDescription) {
            output.customFunctionDescription = output.functionDescription || `Generate ${output.outputName}`;
        }
        if (!output.customJsonSchema) {
            output.customJsonSchema = output.jsonSchema || '{"type": "object"}';
        }

        // Determine output type badge
        let typeBadge = '';
        let typeColor = '';
        if (output.outputType === 'custom') {
            typeBadge = 'Custom JSON';
            typeColor = 'bg-purple-100 text-purple-800';
        } else if (output.outputType === 'artifact') {
            typeBadge = `Artifact (${output.artifactType})`;
            typeColor = 'bg-blue-100 text-blue-800';
        }

        // Check if this is a Plotly output
        const isPlotly = output.outputName === ':plotly:';
        const displayName = isPlotly ? 'Plotly Chart' : output.outputName;

        outputDiv.innerHTML = `
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColor}">
                        ${typeBadge}
                    </span>
                    <span class="text-sm font-semibold text-gray-900">Output ${index + 1}</span>
                    ${isPlotly ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">📊 Plotly.js</span>' : ''}
                </div>
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        Auto-generated
                    </span>
                    <button onclick="toggleOutputEdit(${index})" class="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                        ✏️ Edit
                    </button>
                </div>
            </div>

            <!-- Collapsed View -->
            <div id="output-collapsed-${index}" class="space-y-2">
                <div>
                    <span class="text-xs font-medium text-gray-500">Output Name:</span>
                    <p class="text-sm text-gray-900 font-mono">${displayName}</p>
                </div>
                <div>
                    <span class="text-xs font-medium text-gray-500">Function Name:</span>
                    <p class="text-sm text-gray-900 font-mono">${output.customFunctionName}</p>
                </div>
                <div>
                    <span class="text-xs font-medium text-gray-500">Description:</span>
                    <p class="text-sm text-gray-700">${output.customFunctionDescription}</p>
                </div>
                ${output.outputType === 'custom' ? `
                <div>
                    <span class="text-xs font-medium text-gray-500">JSON Schema:</span>
                    <pre class="text-xs text-gray-700 bg-gray-50 p-2 rounded mt-1 overflow-x-auto">${JSON.stringify(JSON.parse(output.customJsonSchema), null, 2)}</pre>
                </div>
                ` : ''}
            </div>

            <!-- Expanded Edit View -->
            <div id="output-expanded-${index}" class="space-y-3 hidden">
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Output Name</label>
                    <input type="text" id="output-name-${index}" value="${output.outputName}"
                           class="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                           onchange="updateOutputName(${index}, this.value)"
                           ${isPlotly ? 'readonly' : ''} />
                    ${isPlotly ? '<p class="text-xs text-gray-500 mt-1">Special output name for auto-rendering Plotly charts</p>' : ''}
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Function Name</label>
                    <input type="text" id="output-func-name-${index}" value="${output.customFunctionName}"
                           class="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                           onchange="updateOutputFunctionName(${index}, this.value)" />
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Description</label>
                    <textarea id="output-desc-${index}" rows="2"
                              class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                              onchange="updateOutputDescription(${index}, this.value)">${output.customFunctionDescription}</textarea>
                </div>
                ${output.outputType === 'custom' ? `
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">JSON Schema</label>
                    <textarea id="output-schema-${index}" rows="6"
                              class="w-full border border-gray-300 rounded px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                              onchange="updateOutputSchema(${index}, this.value)">${JSON.stringify(JSON.parse(output.customJsonSchema), null, 2)}</textarea>
                </div>
                ` : ''}
                <div class="flex justify-end">
                    <button onclick="toggleOutputEdit(${index})"
                            class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-medium">
                        Done
                    </button>
                </div>
            </div>
        `;

        container.appendChild(outputDiv);
    });

    // Add summary
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'mt-4 p-3 bg-gray-50 rounded-lg';
    summaryDiv.innerHTML = `
        <p class="text-sm text-gray-700">
            <strong>${outputs.length} custom output${outputs.length !== 1 ? 's' : ''}</strong> will be available from your agent.
            ${outputs.length > 0 ? 'These structured outputs can be used for API integrations, dashboards, and data processing.' : ''}
        </p>
    `;
    container.appendChild(summaryDiv);
}

function toggleOutputEdit(index) {
    const collapsed = document.getElementById(`output-collapsed-${index}`);
    const expanded = document.getElementById(`output-expanded-${index}`);

    if (collapsed && expanded) {
        collapsed.classList.toggle('hidden');
        expanded.classList.toggle('hidden');
    }
}

// Sanitize function/output names - remove special characters (including &, !, @, #, spaces, etc.) and convert to snake_case
function sanitizeFunctionName(value) {
    if (!value) return '';
    return value
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')  // Replace ANY non-alphanumeric char (spaces, &, !, @, #, etc.) with underscore
        .replace(/_+/g, '_')           // Replace multiple consecutive underscores with single underscore
        .replace(/^_|_$/g, '');        // Remove leading/trailing underscores
}

function updateOutputName(index, value) {
    if (outputs[index]) {
        const sanitized = sanitizeFunctionName(value);
        outputs[index].outputName = sanitized;

        // Update the input field to show sanitized value
        const inputElement = document.getElementById(`output-name-${index}`);
        if (inputElement) {
            inputElement.value = sanitized;
        }

        console.log(`✅ Updated Output ${index} name: ${value} → ${sanitized}`);
    }
}

function updateOutputFunctionName(index, value) {
    if (outputs[index]) {
        const sanitized = sanitizeFunctionName(value);
        outputs[index].customFunctionName = sanitized;

        // Update the input field to show sanitized value
        const inputElement = document.getElementById(`output-func-name-${index}`);
        if (inputElement) {
            inputElement.value = sanitized;
        }

        console.log(`✅ Updated Output ${index} function name: ${value} → ${sanitized}`);
    }
}

function updateOutputDescription(index, value) {
    if (outputs[index]) {
        outputs[index].customFunctionDescription = value;
        console.log(`✅ Updated Output ${index} description: ${value}`);
    }
}

function updateOutputSchema(index, value) {
    if (outputs[index]) {
        try {
            // Validate JSON
            JSON.parse(value);
            outputs[index].customJsonSchema = value;
            console.log(`✅ Updated Output ${index} JSON schema`);
        } catch (e) {
            console.error(`❌ Invalid JSON schema for Output ${index}:`, e);
            alert('Invalid JSON schema. Please check your syntax.');
        }
    }
}

// ========== MANUAL OUTPUTS FUNCTIONS ==========

function addOutput() {
    outputCounter++;
    const newOutput = {
        id: `output-${outputCounter}`,
        outputName: '',
        functionName: '',
        outputType: 'custom',
        artifactType: 'text',
        jsonSchema: ''
    };
    outputs.push(newOutput);
    renderOutputs();
    console.log(`✅ Added Output: ${newOutput.id}`);
}

function removeOutput(outputId) {
    outputs = outputs.filter(output => output.id !== outputId);
    renderOutputs();
}

function renderOutputs() {
    const container = document.getElementById('outputsList');
    if (!container) return;

    container.innerHTML = '';

    if (outputs.length === 0) {
        container.innerHTML = '<div class="text-center py-8 text-gray-400"><p>No outputs configured yet. Click "Add Output" to get started.</p></div>';
        return;
    }

    outputs.forEach((output, index) => {
        const outputDiv = document.createElement('div');
        outputDiv.className = 'bg-gray-50 rounded-lg p-4 border border-gray-200';
        outputDiv.id = output.id;

        outputDiv.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <h4 class="text-sm font-semibold text-gray-900">Output ${index + 1}</h4>
                <button
                    onclick="removeOutput('${output.id}')"
                    class="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                    Remove
                </button>
            </div>

            <div class="space-y-3">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Output Type</label>
                    <select id="${output.id}-outputType" class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                        <option value="custom" ${output.outputType === 'custom' ? 'selected' : ''}>Custom (JSON)</option>
                        <option value="artifact" ${output.outputType === 'artifact' ? 'selected' : ''}>Artifact</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Output Name</label>
                    <input type="text" id="${output.id}-outputName" value="${output.outputName}"
                           placeholder="e.g., campaign_plan"
                           class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Function Name</label>
                    <input type="text" id="${output.id}-functionName" value="${output.functionName}"
                           placeholder="e.g., generate_campaign_plan"
                           class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>

                <div id="${output.id}-artifact-fields" style="display: ${output.outputType === 'artifact' ? 'block' : 'none'}">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Artifact Type</label>
                    <select id="${output.id}-artifactType" class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                        <option value="text" ${output.artifactType === 'text' ? 'selected' : ''}>Text</option>
                        <option value="image" ${output.artifactType === 'image' ? 'selected' : ''}>Image</option>
                        <option value="react" ${output.artifactType === 'react' ? 'selected' : ''}>React Component</option>
                    </select>
                </div>

                <div id="${output.id}-json-fields" style="display: ${output.outputType === 'custom' ? 'block' : 'none'}">
                    <label class="block text-sm font-medium text-gray-700 mb-1">JSON Schema <span class="text-xs text-gray-500">(properties only)</span></label>
                    <textarea id="${output.id}-jsonSchema" rows="6"
                              placeholder='{"campaign_name": {"type": "string"}, "budget": {"type": "number"}}'
                              class="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono">${output.jsonSchema}</textarea>
                    <p class="text-xs text-gray-500 mt-1">Tip: Use :plotly: in property description for auto-rendered charts</p>
                </div>
            </div>
        `;

        container.appendChild(outputDiv);

        // Add event listeners
        const typeSelect = document.getElementById(`${output.id}-outputType`);
        typeSelect.addEventListener('change', function() {
            const outputIndex = outputs.findIndex(o => o.id === output.id);
            if (outputIndex !== -1) {
                outputs[outputIndex].outputType = this.value;
                renderOutputs();
            }
        });

        ['outputName', 'functionName', 'artifactType', 'jsonSchema'].forEach(field => {
            const element = document.getElementById(`${output.id}-${field}`);
            if (element) {
                element.addEventListener('input', function() {
                    const outputIndex = outputs.findIndex(o => o.id === output.id);
                    if (outputIndex !== -1) {
                        // Sanitize outputName and functionName
                        if (field === 'outputName' || field === 'functionName') {
                            const sanitized = sanitizeFunctionName(this.value);
                            outputs[outputIndex][field] = sanitized;
                            this.value = sanitized; // Update input field to show sanitized value
                            console.log(`✅ Sanitized ${field}: ${this.value} → ${sanitized}`);
                        } else {
                            outputs[outputIndex][field] = this.value;
                        }
                    }
                });
            }
        });
    });
}

// ========== PROMPT VARIABLES FUNCTIONS (STEP 6) ==========

function addPromptVariable() {
    variableCounter++;
    const newVariable = {
        id: `var-${variableCounter}`,
        variableName: '',
        targetKnowledgeBase: '',
        targetFunction: 'read', // Default to 'read' for text KBs, user can change to 'list_columns' for database KBs
        listOfVariables: ''
    };
    promptVariables.push(newVariable);
    renderPromptVariables();
    console.log(`✅ Added Prompt Variable: ${newVariable.id}`);
}

function removePromptVariable(variableId) {
    promptVariables = promptVariables.filter(variable => variable.id !== variableId);
    renderPromptVariables();
}

function renderPromptVariables() {
    const container = document.getElementById('promptVariablesList');
    if (!container) return;

    container.innerHTML = '';

    if (promptVariables.length === 0) {
        container.innerHTML = '<div class="text-center py-8 text-gray-400"><p>No prompt variables configured yet. Click "Add Prompt Variable" to get started.</p></div>';
        return;
    }

    promptVariables.forEach((variable, index) => {
        const varDiv = document.createElement('div');
        varDiv.className = 'bg-gray-50 rounded-lg p-4 border border-gray-200';
        varDiv.id = variable.id;

        varDiv.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <h4 class="text-sm font-semibold text-gray-900">Variable ${index + 1}</h4>
                <button
                    onclick="removePromptVariable('${variable.id}')"
                    class="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                    Remove
                </button>
            </div>

            <div class="space-y-3">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Variable Name</label>
                    <input type="text" id="${variable.id}-variableName" value="${variable.variableName}"
                           placeholder="e.g., customer_data"
                           class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Target Knowledge Base</label>
                    <select id="${variable.id}-targetKnowledgeBase" class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                        <option value="">Select a knowledge base...</option>
                        ${knowledgeBases.map(kb => `<option value="${kb.name}" ${variable.targetKnowledgeBase === kb.name ? 'selected' : ''}>${kb.name}</option>`).join('')}
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Target Function</label>
                    <select id="${variable.id}-targetFunction" class="w-full border border-gray-300 rounded px-3 py-2 text-sm" onchange="updatePromptVariableFunction('${variable.id}')">
                        <option value="read" ${variable.targetFunction === 'read' ? 'selected' : ''}>Read</option>
                        <option value="list_columns" ${variable.targetFunction === 'list_columns' ? 'selected' : ''}>List columns</option>
                    </select>
                    <p class="text-xs text-gray-500 mt-1">
                        <strong>Read:</strong> For Text knowledge bases<br>
                        <strong>List columns:</strong> For Database knowledge bases
                    </p>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">List of Variables <span class="text-xs text-gray-500">(comma-separated expressions)</span></label>
                    <textarea id="${variable.id}-listOfVariables" rows="3"
                              placeholder="customers, products.{sku,name,price}, !*.email"
                              class="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono">${variable.listOfVariables}</textarea>
                    <p class="text-xs text-gray-500 mt-1">
                        Examples: <code class="bg-white px-1 rounded">customers</code> (all columns),
                        <code class="bg-white px-1 rounded">table.{col1,col2}</code> (specific),
                        <code class="bg-white px-1 rounded">!*.email</code> (exclude)
                    </p>
                </div>
            </div>
        `;

        container.appendChild(varDiv);

        // Add event listeners
        ['variableName', 'targetKnowledgeBase', 'targetFunction', 'listOfVariables'].forEach(field => {
            const element = document.getElementById(`${variable.id}-${field}`);
            if (element) {
                element.addEventListener('input', function() {
                    const variableIndex = promptVariables.findIndex(v => v.id === variable.id);
                    if (variableIndex !== -1) {
                        promptVariables[variableIndex][field] = this.value;

                        // Auto-suggest target function based on KB type
                        if (field === 'targetKnowledgeBase') {
                            const kb = knowledgeBases.find(k => k.name === this.value);
                            if (kb) {
                                const suggestedFunction = kb.type === 'database' ? 'list_columns' : 'read';
                                const functionSelect = document.getElementById(`${variable.id}-targetFunction`);
                                if (functionSelect && promptVariables[variableIndex].targetFunction !== suggestedFunction) {
                                    // Auto-update if not manually changed
                                    promptVariables[variableIndex].targetFunction = suggestedFunction;
                                    functionSelect.value = suggestedFunction;
                                    console.log(`💡 Auto-set target function to '${suggestedFunction}' for ${kb.type} KB`);
                                }
                            }
                        }
                    }
                });
            }
        });
    });
}

// Update prompt variable function (called when user changes dropdown)
function updatePromptVariableFunction(variableId) {
    const functionSelect = document.getElementById(`${variableId}-targetFunction`);
    if (functionSelect) {
        const variableIndex = promptVariables.findIndex(v => v.id === variableId);
        if (variableIndex !== -1) {
            promptVariables[variableIndex].targetFunction = functionSelect.value;
            console.log(`✏️ User manually set target function to '${functionSelect.value}'`);
        }
    }
}

// Navigation Functions
function nextStep() {
    if (!validateCurrentStep()) return;

    if (currentStep < 7) {
        currentStep++;
        updateStepDisplay();
        updateProgressBar(); // Update progress bar on step change

        // Show AI encouragement
        if (currentStep === 1) {
            addChatMessage('assistant', getTranslation('sidebar.step1.msg'));
        } else if (currentStep === 2) {
            addChatMessage('assistant', getTranslation('sidebar.step2.msg'));
        } else if (currentStep === 3) {
            addChatMessage('assistant', getTranslation('sidebar.step3.msg'));
        } else if (currentStep === 4) {
            addChatMessage('assistant', 'Optional: Add additional tools to extend your agent capabilities.');
        } else if (currentStep === 5) {
            addChatMessage('assistant', 'Optional: Configure custom outputs for structured data.');
        } else if (currentStep === 6) {
            addChatMessage('assistant', 'Optional: Set up prompt variables to inject dynamic data.');
        } else if (currentStep === 7) {
            renderConfigSummary();
            updateSessionStatistics();
            addChatMessage('assistant', getTranslation('sidebar.step4.msg'));
        }
    }
}

function prevStep() {
    if (currentStep > 0) {
        currentStep--;
        updateStepDisplay();
        updateProgressBar(); // Update progress bar on step change
    }
}

function updateStepDisplay() {
    // Hide all steps (support both old and new layouts)
    document.querySelectorAll('.step-content, .step-content-panel').forEach(step => {
        step.classList.remove('active');
        step.style.display = 'none';
    });

    // Show current step (try both selectors)
    let currentStepElement = document.querySelector(`.step-content[data-step="${currentStep}"]`);
    if (!currentStepElement) {
        currentStepElement = document.getElementById(`step-${currentStep}`);
    }
    if (currentStepElement) {
        currentStepElement.classList.add('active');
        currentStepElement.style.display = 'block';
    }

    // Update progress indicators (old layout)
    document.querySelectorAll('.step-indicator').forEach((indicator, index) => {
        const circle = indicator.querySelector('div');
        if (!circle) return;
        if (index < currentStep) {
            indicator.classList.add('completed');
            indicator.classList.remove('active');
            circle.classList.remove('bg-gray-300');
            circle.classList.add('bg-green-500');
            circle.innerHTML = '<svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>';
        } else if (index === currentStep) {
            indicator.classList.add('active');
            indicator.classList.remove('completed');
            circle.classList.remove('bg-gray-300', 'bg-green-500');
            circle.classList.add('bg-indigo-600');
            circle.textContent = currentStep;
        } else {
            indicator.classList.remove('active', 'completed');
            circle.classList.remove('bg-indigo-600', 'bg-green-500');
            circle.classList.add('bg-gray-300');
            circle.textContent = index;
        }
    });

    // Update sidebar navigation (new dashboard layout)
    document.querySelectorAll('.step-nav-item, .progress-step').forEach(navItem => {
        const stepNum = parseInt(navItem.dataset.step);
        if (stepNum === currentStep) {
            navItem.classList.add('active');
            navItem.classList.remove('completed');
        } else if (stepNum < currentStep) {
            navItem.classList.add('completed');
            navItem.classList.remove('active');
        } else {
            navItem.classList.remove('active', 'completed');
        }
    });

    // Update step number (if exists)
    const stepNum = document.getElementById('currentStepNum') || document.getElementById('currentStepDisplay');
    if (stepNum) {
        stepNum.textContent = currentStep + 1; // Display 1-based step number
    }

    // Update navigation buttons
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) {
        prevBtn.disabled = currentStep === 0;
        prevBtn.style.visibility = currentStep === 0 ? 'hidden' : 'visible';
    }

    const nextBtn = document.getElementById('nextBtn');
    if (currentStep === 7) {
        nextBtn.style.display = 'none';
    } else {
        nextBtn.style.display = 'block';
    }

    // Populate Step 3 (Agent Config) fields when navigating to it
    if (currentStep === 3) {
        // Populate Agent Name
        if (agentConfig.agentName) {
            document.getElementById('agentName').value = agentConfig.agentName;
            console.log(`📝 Populated Agent Name: "${agentConfig.agentName}"`);
        }

        // Populate Model Selection
        if (agentConfig.model) {
            document.getElementById('modelSelect').value = agentConfig.model;
            console.log(`📝 Populated Model: ${agentConfig.model}`);
        }

        // Populate Temperature (both slider and input)
        if (agentConfig.temperature !== undefined) {
            const tempSlider = document.getElementById('temperature');
            const tempInput = document.getElementById('temperatureInput');
            if (tempSlider) tempSlider.value = agentConfig.temperature;
            if (tempInput) tempInput.value = agentConfig.temperature;
            console.log(`📝 Populated Temperature: ${agentConfig.temperature}`);
        }

        // Populate Max Tools Iterations (both slider and input)
        if (agentConfig.maxToolsIterations !== undefined) {
            const maxToolsIterationsSlider = document.getElementById('maxToolsIterations');
            const maxToolsIterationsInput = document.getElementById('maxToolsIterationsInput');
            if (maxToolsIterationsSlider) maxToolsIterationsSlider.value = agentConfig.maxToolsIterations;
            if (maxToolsIterationsInput) maxToolsIterationsInput.value = agentConfig.maxToolsIterations;
            console.log(`📝 Populated Max Tools Iterations: ${agentConfig.maxToolsIterations}`);
        }

        // Populate System Prompt
        if (agentConfig.systemPrompt) {
            document.getElementById('systemPrompt').value = agentConfig.systemPrompt;
            updateSystemPromptCharCount(); // Update character counter
            console.log(`📝 Populated System Prompt: ${agentConfig.systemPrompt.length} chars`);
        }

        // Show Model Reasoning if available
        const reasoningSection = document.getElementById('modelReasoningSection');
        const reasoningText = document.getElementById('modelReasoningText');
        if (agentConfig.modelReasoning) {
            reasoningText.textContent = agentConfig.modelReasoning;
            reasoningSection.style.display = 'block';
            console.log(`📝 Showing Model Reasoning`);
        } else {
            reasoningSection.style.display = 'none';
        }
    }

    // Populate Step 4 (Tools) when navigating to it
    if (currentStep === 4) {
        renderKnowledgeBaseTools();
        console.log(`📝 Rendered ${knowledgeBases.length} Knowledge Base tools`);
    }

    // Populate Step 5 (Outputs) when navigating to it
    if (currentStep === 5) {
        renderAutoGeneratedOutputs();
        console.log(`📝 Rendered ${outputs.length} auto-generated outputs`);
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Validation Functions
function validateCurrentStep() {
    switch(currentStep) {
        case 0:
            return validateAgentDescription();
        case 1:
            return validateKnowledgeBases();
        case 2:
            return validateProjectConfig();
        case 3:
            return validateAgentConfig();
        case 4:
            // Step 4: Additional Tools (Optional)
            return true;
        case 5:
            // Step 5: Outputs (Optional)
            return true;
        case 6:
            // Step 6: Prompt Variables (Optional)
            return true;
        case 7:
            // Step 7: Deploy (Final step)
            return true;
        default:
            return false;
    }
}

function validateAgentDescription() {
    const description = document.getElementById('agentDescription').value.trim();

    // Allow proceeding if there's a file attachment (will be used for agent generation)
    if (currentAttachment && currentAttachment.content) {
        // Use attachment content as description if no description provided
        if (!description || description.length < 50) {
            agentConfig.description = currentAttachment.content.substring(0, 200) + '...';
        } else {
            agentConfig.description = description;
        }
        return true;
    }

    // If no attachment, require description
    if (!description || description.length < 50) {
        alert(getTranslation('validation.description.detailed', 'Please provide a detailed description of your agent (at least 50 characters).'));
        return false;
    }

    agentConfig.description = description;
    return true;
}

// Update system prompt character count
function updateSystemPromptCharCount() {
    const systemPromptTextarea = document.getElementById('systemPrompt');
    const charCountElement = document.getElementById('systemPromptCharCount');
    const warningElement = document.getElementById('systemPromptWarning');
    const errorElement = document.getElementById('systemPromptError');

    if (!systemPromptTextarea || !charCountElement) return;

    const currentLength = systemPromptTextarea.value.length;
    const maxLength = 9000;

    // Update character count
    charCountElement.textContent = `${currentLength} / ${maxLength}`;

    // Update styling based on length
    if (currentLength >= maxLength) {
        // At or over limit - show error
        charCountElement.classList.remove('text-gray-600', 'text-amber-600');
        charCountElement.classList.add('text-red-600', 'font-bold');
        warningElement?.classList.add('hidden');
        errorElement?.classList.remove('hidden');
    } else if (currentLength >= maxLength * 0.9) {
        // 90% or more - show warning
        charCountElement.classList.remove('text-gray-600', 'text-red-600', 'font-bold');
        charCountElement.classList.add('text-amber-600', 'font-medium');
        warningElement?.classList.remove('hidden');
        errorElement?.classList.add('hidden');
    } else {
        // Under 90% - normal
        charCountElement.classList.remove('text-amber-600', 'text-red-600', 'font-bold', 'font-medium');
        charCountElement.classList.add('text-gray-600');
        warningElement?.classList.add('hidden');
        errorElement?.classList.add('hidden');
    }
}

function validateKnowledgeBases() {
    if (knowledgeBases.length < 1) {
        alert(getTranslation('validation.kb.required', 'Please create at least one knowledge base.'));
        return false;
    }

    for (const kb of knowledgeBases) {
        const kbName = kb.name || 'Untitled';

        // Validate name
        if (!kb.name) {
            alert(`${getTranslation('validation.kb.title', kbName + ' must have a title.')}`);
            return false;
        }

        // For database KBs, validate database and tables
        if (kb.type === 'database') {
            if (!kb.database) {
                alert(`${kbName} must have a database selected.`);
                return false;
            }
            if (!kb.tables || kb.tables.length === 0) {
                alert(`${kbName} must have at least one table added.`);
                return false;
            }
            // Validate each table
            for (const table of kb.tables) {
                if (!table.tableName) {
                    alert(`${kbName} has a table without a table name selected.`);
                    return false;
                }
                if (!table.tdQuery) {
                    alert(`${kbName} - ${table.tableName} must have a TD Query.`);
                    return false;
                }
                if (!table.name) {
                    alert(`${kbName} - ${table.tableName} must have a name.`);
                    return false;
                }
            }
        } else {
            // For text KBs, validate content
            if (!kb.content) {
                alert(`${getTranslation('validation.kb.title.content', kbName + ' must have both a title and content.')}`);
                return false;
            }
            if (kb.content.length > 18000) {
                alert(`${kb.name} ${getTranslation('validation.kb.limit', 'exceeds the 18,000 character limit.')}`);
                return false;
            }
        }
    }

    return true;
}

function validateProjectConfig() {
    const projectName = document.getElementById('projectName').value.trim();
    const projectDesc = document.getElementById('projectDescription').value.trim();

    if (!projectName) {
        alert(getTranslation('validation.project.name', 'Please enter a project name.'));
        return false;
    }

    if (!projectDesc) {
        alert(getTranslation('validation.project.description', 'Please enter a project description.'));
        return false;
    }

    agentConfig.projectName = projectName;
    agentConfig.projectDescription = projectDesc;
    return true;
}

function validateAgentConfig() {
    const agentName = document.getElementById('agentName').value.trim();
    const systemPrompt = document.getElementById('systemPrompt').value.trim();

    if (!agentName) {
        alert(getTranslation('validation.agent.name', 'Please enter an agent name.'));
        return false;
    }

    if (!systemPrompt) {
        alert(getTranslation('validation.agent.prompt', 'Please provide a system prompt.'));
        return false;
    }

    if (systemPrompt.length > 9000) {
        alert('⚠️ System prompt exceeds 9000 character limit. Please shorten it to ensure compatibility with Agent Foundry.');
        return false;
    }

    agentConfig.name = agentName;
    agentConfig.systemPrompt = systemPrompt;
    return true;
}

// Render Configuration Summary
function renderConfigSummary() {
    const summaryDiv = document.getElementById('configSummary');

    const tools = knowledgeBases.map(kb => ({
        name: kb.customToolName || `kb_${kb.name.toLowerCase().replace(/\s+/g, '_')}`,
        description: kb.customToolDescription || `Search and retrieve information from ${kb.name}`
    }));

    summaryDiv.innerHTML = `
        <h3 class="font-bold text-lg mb-4">${getTranslation('step4.summary')}</h3>

        <div class="space-y-3">
            <div>
                <p class="text-sm font-semibold text-gray-600">${getTranslation('step4.agent.name')}</p>
                <p class="text-gray-900">${agentConfig.name}</p>
            </div>

            <div>
                <p class="text-sm font-semibold text-gray-600">${getTranslation('step4.project')}</p>
                <p class="text-gray-900">${agentConfig.projectName}</p>
            </div>

            <div>
                <p class="text-sm font-semibold text-gray-600">${getTranslation('step4.model')}</p>
                <p class="text-gray-900">${agentConfig.model}</p>
            </div>

            <div>
                <p class="text-sm font-semibold text-gray-600">${getTranslation('step4.temperature')}</p>
                <p class="text-gray-900">${agentConfig.temperature}</p>
            </div>

            <div>
                <p class="text-sm font-semibold text-gray-600">Max Tools Iterations:</p>
                <p class="text-gray-900">${agentConfig.maxToolsIterations || 0}</p>
            </div>

            <div>
                <p class="text-sm font-semibold text-gray-600">${getTranslation('step4.kb')}</p>
                <ul class="list-disc list-inside text-gray-900">
                    ${knowledgeBases.map(kb => `<li>${kb.name}</li>`).join('')}
                </ul>
            </div>

            <div>
                <p class="text-sm font-semibold text-gray-600">${getTranslation('step4.tools')}</p>
                <ul class="list-disc list-inside text-gray-900 text-sm">
                    ${tools.map(tool => `<li>${tool.name}</li>`).join('')}
                </ul>
            </div>

            ${outputs && outputs.length > 0 ? `
            <div>
                <p class="text-sm font-semibold text-gray-600">Outputs:</p>
                <ul class="list-disc list-inside text-gray-900 text-sm">
                    ${outputs.map(output => `<li>${output.functionName || output.outputName || 'Unnamed output'}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
        </div>
    `;
}

function updateSessionStatistics() {
    // Calculate end time and total duration
    wizardStats.endTime = Date.now();
    const totalDurationMs = wizardStats.endTime - wizardStats.startTime;
    const totalDurationSec = (totalDurationMs / 1000).toFixed(1);

    // Format time nicely
    const formatTime = (ms) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    };

    const totalTime = formatTime(totalDurationMs);
    const aiGenerationTime = wizardStats.aiGenerationEndTime && wizardStats.aiGenerationStartTime
        ? formatTime(wizardStats.aiGenerationEndTime - wizardStats.aiGenerationStartTime)
        : 'N/A';

    // Calculate total content size
    let totalChars = 0;
    knowledgeBases.forEach(kb => totalChars += (kb.content || '').length);
    totalChars += (agentConfig.systemPrompt || '').length;
    totalChars += (agentConfig.projectDescription || '').length;

    // Format numbers
    const formatNumber = (num) => num.toLocaleString();

    // Count total components
    const totalComponents = knowledgeBases.length + outputs.length + additionalTools.length + promptVariables.length;
    const componentsBreakdown = [
        knowledgeBases.length > 0 ? `${knowledgeBases.length} KB` : null,
        outputs.length > 0 ? `${outputs.length} Output` : null,
        additionalTools.length > 0 ? `${additionalTools.length} Tool` : null,
        promptVariables.length > 0 ? `${promptVariables.length} Variable` : null
    ].filter(Boolean).join(' • ');

    // Update the statistics display
    document.getElementById('totalTimeValue').textContent = totalTime;
    document.getElementById('aiTimeValue').textContent = `AI Generation: ${aiGenerationTime}`;

    document.getElementById('totalTokensValue').textContent = formatNumber(wizardStats.totalTokensUsed);
    document.getElementById('inputTokensValue').textContent = `Input: ${formatNumber(wizardStats.inputTokens)}`;
    document.getElementById('outputTokensValue').textContent = `Output: ${formatNumber(wizardStats.outputTokens)}`;

    document.getElementById('estimatedCostValue').textContent = `$${wizardStats.estimatedCost.toFixed(4)}`;

    document.getElementById('componentsValue').textContent = totalComponents;
    document.getElementById('componentsBreakdown').textContent = componentsBreakdown || 'None';

    document.getElementById('apiCallsValue').textContent = wizardStats.aiApiCalls;

    document.getElementById('contentSizeValue').textContent = formatNumber(totalChars);

    console.log('📊 Session Statistics Updated:');
    console.log(`  Total Time: ${totalTime}`);
    console.log(`  AI Generation Time: ${aiGenerationTime}`);
    console.log(`  Total Tokens: ${formatNumber(wizardStats.totalTokensUsed)}`);
    console.log(`  Estimated Cost: $${wizardStats.estimatedCost.toFixed(4)}`);
    console.log(`  Components: ${totalComponents}`);
    console.log(`  API Calls: ${wizardStats.aiApiCalls}`);
    console.log(`  Content Size: ${formatNumber(totalChars)} chars`);
}

// Download Functions
function downloadKnowledgeBases() {
    // Create agent name slug for filenames
    const agentSlug = (agentConfig.agentName || agentConfig.name || 'Agent').replace(/\s+/g, '_');

    knowledgeBases.forEach((kb, index) => {
        const filename = `${agentSlug}_KB${index + 1}_${kb.name.replace(/\s+/g, '_')}.md`;
        const content = generateKBFile(kb);
        downloadFile(filename, content);
    });

    addChatMessage('assistant', `✅ Downloaded ${knowledgeBases.length} knowledge base files!`);
}

function generateKBFile(kb) {
    return `# ${kb.name}

${kb.content}

---

**Generated by:** PM Agent Squad Master - AI-Powered Agent Builder
**Created:** ${new Date().toLocaleDateString()}
**Character Count:** ${kb.content.length.toLocaleString()}
`;
}

function downloadProjectConfig() {
    const content = `# Project Setup Guide

## Project Information

**Project Name:** ${agentConfig.projectName}

**Description:**
${agentConfig.projectDescription}

## Knowledge Bases

This project includes ${knowledgeBases.length} knowledge bases:
${knowledgeBases.map((kb, i) => `${i + 1}. ${kb.name}`).join('\n')}

## Setup Steps for Agent Foundry

### 1. Create Project
1. Log into Treasure Data Console
2. Navigate to AI Agent Foundry
3. Click "Create Project"
4. Enter project name: **${agentConfig.projectName}**
5. Enter description: **${agentConfig.projectDescription}**
6. Click "Create"

### 2. Upload Knowledge Bases
1. In your project, go to "Knowledge Bases"
2. Click "Upload Knowledge Base"
3. Upload each of the ${knowledgeBases.length} .md files you downloaded
4. Wait for indexing to complete (5-10 minutes per file)
5. Verify all knowledge bases are "Active"

### 3. Configure Agent
Follow the instructions in **AGENT_CONFIG.md** to:
- Create the agent
- Set model and temperature
- Add system prompt
- Configure knowledge base tools
- Set output preferences

### 4. Test Agent
1. Use the built-in test console
2. Try sample queries related to your knowledge bases
3. Verify responses are accurate and helpful
4. Adjust configuration if needed

### 5. Deploy
1. Review all settings
2. Click "Deploy"
3. Note the agent endpoint URL
4. Integrate with your application

---

**Generated by:** PM Agent Squad Master - AI-Powered Agent Builder
**Created:** ${new Date().toLocaleDateString()}
`;

    // Create agent name slug for filename
    const agentSlug = (agentConfig.agentName || agentConfig.name || 'Agent').replace(/\s+/g, '_');
    const filename = `${agentSlug}_PROJECT_SETUP.md`;

    downloadFile(filename, content);
    addChatMessage('assistant', '✅ Downloaded project setup guide!');
}

function downloadAgentConfig() {
    const tools = knowledgeBases.map((kb, i) => ({
        name: kb.customToolName || `kb_${kb.name.toLowerCase().replace(/\s+/g, '_')}`,
        description: kb.customToolDescription || `Search and retrieve information from ${kb.name}`,
        type: 'knowledge-base'
    }));

    const content = `# Agent Configuration Guide

## Agent Details

**Agent Name:** ${agentConfig.name}
**Model:** ${agentConfig.model}
**Temperature:** ${agentConfig.temperature}
**Max Tools Iterations:** ${agentConfig.maxToolsIterations}

## System Prompt

${agentConfig.systemPrompt}

## Knowledge Base Tools

${tools.map((tool, i) => `### Tool ${i + 1}: ${tool.name}

**Description:** ${tool.description}
**Type:** ${tool.type}
**Knowledge Base:** ${knowledgeBases[i].name}
`).join('\n')}

## Configuration Steps in Agent Foundry

### 1. Create Agent
1. In your project, click "Create Agent"
2. Enter agent name: **${agentConfig.name}**
3. Select model: **${agentConfig.model}**
4. Set temperature: **${agentConfig.temperature}**
5. Set max tools iterations: **${agentConfig.maxToolsIterations}**
6. Click "Next"

### 2. Add System Prompt
1. In the "Instructions" section
2. Paste the system prompt above
3. Review and ensure it matches your requirements
4. Click "Save"

### 3. Add Knowledge Base Tools
For each knowledge base, add a tool:

${tools.map((tool, i) => `**${tool.name}:**
- Tool Type: Knowledge Base
- Knowledge Base: Select "${knowledgeBases[i].name}"
- Description: "${tool.description}"
`).join('\n')}

### 4. Add Additional Tools (Optional)

${additionalTools.length > 0 ? `**Your Configured Tools:**

${additionalTools.map((tool, i) => `**Tool ${i + 1}: ${tool.functionName || 'Unnamed Tool'}**
- Function Name: ${tool.functionName}
- Function Description: ${tool.functionDescription}
- Tool Type: ${tool.type === 'agent' ? 'Agent' : tool.type === 'image_generator' ? 'Image Generator' : 'Workflow Executor'}
${tool.type === 'agent' ? `- Target Agent: ${tool.targetAgent}` : ''}
${tool.type === 'image_generator' ? `- Image Format: ${tool.imageFormat}` : ''}
${tool.type === 'workflow' ? `- Workflow ARN: ${tool.workflowArn}` : ''}
- Output Mode: ${tool.outputMode === 'return' ? 'Return (Agent processes result)' : 'Stream (Direct to user)'}
`).join('\n')}

**To add these tools in Agent Foundry:**
1. Navigate to the "Tools" section
2. Click "Add Tool"
3. Select the tool type and fill in the details above
4. Save each tool configuration
` : `Agent Foundry supports additional tool types beyond Knowledge Base:

**Tool Types Available:**
- **Knowledge Base** - Query structured data (already added above)
- **Agent** - Call another agent for specialized tasks
- **Image Generator** - Create/edit images
- **Workflow Executor** - Run complex workflows

**Example: Add Agent Tool**
- Function Name: create_email_draft
- Function Description: Creates professional email draft based on campaign brief
- Target: Agent
- Target Agent: Email_Creator_Agent
- Output Mode: Return
`}
**See:** 04_Add_Tools_Guide.md for detailed tool configuration

### 5. Configure Outputs (Optional)

${outputs.length > 0 ? `**Your Configured Outputs:**

${outputs.map((output, i) => {
    const functionName = output.customFunctionName || output.functionName || 'generate_output';
    const functionDescription = output.customFunctionDescription || output.functionDescription || '';
    const jsonSchema = output.customJsonSchema || output.jsonSchema || '';

    return `**Output ${i + 1}: ${output.outputName || 'Unnamed Output'}**
- Output Name: ${output.outputName}
- Function Name: ${functionName}
${functionDescription ? `- Description: ${functionDescription}` : ''}
- Output Type: ${output.outputType === 'custom' ? 'Custom (JSON)' : 'Artifact'}
${output.outputType === 'artifact' ? `- Artifact Type: ${output.artifactType}` : ''}
${output.outputType === 'custom' && jsonSchema ? `- JSON Schema:
  ${jsonSchema}` : ''}`;
}).join('\n\n')}

**To add these outputs in Agent Foundry:**
1. Navigate to the "Outputs" section
2. Click "Add Output"
3. Fill in the details above
4. For Custom outputs, paste the JSON schema
5. Save each output configuration
` : `Define how your agent returns structured information:

**Output Types:**
- **Custom (JSON)** - Structured data for APIs, databases
- **Artifact (Text)** - Formatted documents, reports
- **Artifact (Image)** - Visual content
- **Artifact (React)** - Interactive visualizations, dashboards

**Example: Campaign Plan Output (JSON Schema)**
- outputName: campaign_plan
- functionName: generate_campaign_plan
- outputType: Custom
- jsonSchema properties: campaign_name (string), budget (number), platforms (array)

**Special Output: :plotly:**
Name an output ":plotly:" to auto-render as interactive Plotly chart
`}
**See:** 05_Add_Output_Guide.md for examples and React/Plotly code

### 6. Add Prompt Variables (Optional)

${promptVariables.length > 0 ? `**Your Configured Prompt Variables:**

${promptVariables.map((variable, i) => `**Variable ${i + 1}: ${variable.variableName || 'Unnamed Variable'}**
- Variable Name: ${variable.variableName}
- Target Knowledge Base: ${variable.targetKnowledgeBase}
- Target Function: ${variable.targetFunction}
- List of Variables: ${variable.listOfVariables}
`).join('\n')}

**To add these prompt variables in Agent Foundry:**
1. Navigate to the "Prompt Variables" section
2. Click "Add Variable"
3. Fill in the details above
4. Save each variable configuration
5. Reference in prompts using {{${promptVariables[0]?.variableName || 'variable_name'}}}
` : `Dynamically inject data from knowledge bases into prompts:

**Variable Syntax Examples:**
- customers (all columns from customers table)
- products.{sku,name,price} (only specified columns)
- behavior_*.* (all columns from tables starting with "behavior_")
- !*.internal_* (exclude columns starting with "internal_")

**Configuration:**
- Variable Name: database_schema
- Target Knowledge Base: Campaign_Performance_DB
- Target Function: List columns
- List of Variables: campaigns, metrics.{impressions,clicks,conversions}
`}
**See:** 06_Add_Prompt_Variables_Guide.md for detailed syntax

### 7. Test Agent
Sample test queries:
${tools.slice(0, 3).map((tool, i) => `- "Tell me about ${knowledgeBases[i].name.toLowerCase()}"`).join('\n')}
- "What can you help me with?"
- (Add domain-specific test queries)

### 8. Review and Deploy
1. Review all configuration
2. Run test queries
3. Verify knowledge base responses
4. Test tools and outputs (if added)
5. Click "Deploy"
6. Note agent ID and endpoint

---

**Agent Configuration Complete!**

Your agent is now ready to:
${knowledgeBases.slice(0, 5).map((kb, i) => `- Provide information from ${kb.name}`).join('\n')}

**Generated by:** PM Agent Squad Master - AI-Powered Agent Builder
**Created:** ${new Date().toLocaleDateString()}
`;

    // Create agent name slug for filename
    const agentSlug = (agentConfig.agentName || agentConfig.name || 'Agent').replace(/\s+/g, '_');
    const filename = `${agentSlug}_AGENT_CONFIG.md`;

    downloadFile(filename, content);

    let message = '✅ Downloaded agent configuration guide!';
    if (additionalTools.length > 0 || outputs.length > 0 || promptVariables.length > 0) {
        message += '\n\n📦 Includes:';
        if (additionalTools.length > 0) message += `\n• ${additionalTools.length} additional tool(s)`;
        if (outputs.length > 0) message += `\n• ${outputs.length} output configuration(s)`;
        if (promptVariables.length > 0) message += `\n• ${promptVariables.length} prompt variable(s)`;
    }

    addChatMessage('assistant', message);
}

function viewOutputWebpage() {
    // Generate HTML content for the output webpage
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${agentConfig.name || 'Agent'} - Configuration Output</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html {
            scroll-behavior: smooth;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }

        .header h1 {
            font-size: 36px;
            font-weight: 700;
            margin-bottom: 10px;
        }

        .header p {
            font-size: 18px;
            opacity: 0.9;
        }

        .content {
            padding: 40px;
        }

        .section {
            margin-bottom: 40px;
            padding: 30px;
            background: #f9fafb;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
        }

        .section-title {
            font-size: 24px;
            font-weight: 600;
            color: #667eea;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
        }

        .copy-box {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-top: 15px;
            position: relative;
        }

        .copy-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #667eea;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
        }

        .copy-btn:hover {
            background: #5a67d8;
            transform: translateY(-2px);
        }

        .copy-btn:active {
            transform: translateY(0);
        }

        .field {
            margin-bottom: 20px;
        }

        .field-label {
            font-weight: 600;
            color: #4b5563;
            margin-bottom: 8px;
            display: block;
        }

        .field-value {
            background: white;
            padding: 12px;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
            font-family: 'Courier New', monospace;
            color: #1f2937;
        }

        .kb-list {
            list-style: none;
        }

        .kb-item {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 15px;
            border: 1px solid #e5e7eb;
        }

        .kb-name {
            font-weight: 600;
            color: #667eea;
            margin-bottom: 10px;
            font-size: 18px;
        }

        .kb-desc {
            color: #6b7280;
            margin-bottom: 10px;
            font-size: 14px;
        }

        .kb-content {
            background: #f9fafb;
            padding: 15px;
            border-radius: 6px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            white-space: pre-wrap;
            word-wrap: break-word;
            max-height: 300px;
            overflow-y: auto;
        }

        .badge {
            display: inline-block;
            padding: 4px 12px;
            background: #667eea;
            color: white;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            margin-right: 8px;
        }

        .footer {
            text-align: center;
            padding: 30px;
            background: #f9fafb;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
        }

        pre {
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        /* Navigation Styles */
        .nav-bar {
            position: sticky;
            top: 0;
            background: white;
            border-bottom: 3px solid #667eea;
            padding: 15px 20px;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .nav-container {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
        }

        .nav-label {
            font-weight: 600;
            color: #667eea;
            margin-right: 10px;
            font-size: 14px;
        }

        .nav-link {
            display: inline-block;
            padding: 8px 16px;
            background: #f3f4f6;
            color: #4b5563;
            text-decoration: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s;
            border: 1px solid #e5e7eb;
        }

        .nav-link:hover {
            background: #667eea;
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }

        .nav-link:active {
            transform: translateY(0);
        }

        .back-to-top {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #667eea;
            color: white;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            font-size: 24px;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            transition: all 0.3s;
            z-index: 999;
        }

        .back-to-top:hover {
            background: #5a67d8;
            transform: translateY(-5px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header" id="top">
            <h1>🤖 ${agentConfig.name || 'AI Agent'}</h1>
            <p>Configuration Output - Ready for Agent Foundry</p>
        </div>

        <!-- Sticky Navigation Bar -->
        <nav class="nav-bar">
            <div class="nav-container">
                <span class="nav-label">Jump to:</span>
                <a href="#knowledge-bases" class="nav-link">📚 Knowledge Bases</a>
                <a href="#project-config" class="nav-link">📁 Project</a>
                <a href="#agent-config" class="nav-link">🤖 Agent</a>
                <a href="#tools" class="nav-link">🔧 Tools</a>
                <a href="#outputs" class="nav-link">📤 Outputs</a>
                <a href="#summary" class="nav-link">📋 Summary</a>
            </div>
        </nav>

        <div class="content">
            <!-- Step 1: Knowledge Bases (Detailed) -->
            <div class="section" id="knowledge-bases">
                <h2 class="section-title">📚 Knowledge Bases (${knowledgeBases.length})</h2>
                <p style="color: #6b7280; margin-bottom: 20px;">Each knowledge base provides specialized expertise to your agent. Copy each section to create the knowledge base in Agent Foundry.</p>

                ${knowledgeBases.length === 0 ? '<p style="color: #6b7280;">No knowledge bases configured</p>' : `
                    <ul class="kb-list">
                        ${knowledgeBases.map((kb, index) => {
                            const toolId = kb.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                            return `
                            <li class="kb-item">
                                <div class="kb-name">
                                    <span class="badge">KB ${index + 1}</span>
                                    ${kb.name}
                                </div>
                                <div style="margin-top: 15px;">
                                    <div class="field">
                                        <span class="field-label">📝 Knowledge Base Name:</span>
                                        <div class="copy-box">
                                            <button class="copy-btn" onclick="copyToClipboard('kbName${index}')">📋 Copy</button>
                                            <div id="kbName${index}" class="field-value">${kb.name}</div>
                                        </div>
                                    </div>

                                    ${kb.type === 'database' ? `
                                    <div class="field">
                                        <span class="field-label">🗄️ Database:</span>
                                        <div class="copy-box">
                                            <button class="copy-btn" onclick="copyToClipboard('kbDatabase${index}')">📋 Copy</button>
                                            <div id="kbDatabase${index}" class="field-value">${kb.database || 'Not specified'}</div>
                                        </div>
                                    </div>

                                    <div class="field">
                                        <span class="field-label">📊 Tables:</span>
                                        <div style="margin-left: 20px;">
                                            ${kb.tables && kb.tables.length > 0 ? kb.tables.map((table, tIndex) => `
                                                <div style="margin-bottom: 15px; padding: 10px; background: #f9fafb; border-radius: 6px;">
                                                    <div style="font-weight: 600; margin-bottom: 8px;">Table ${tIndex + 1}: ${table.name || 'Untitled'}</div>
                                                    <div style="margin-bottom: 5px;"><strong>Table Name:</strong> ${table.tableName || 'Not specified'}</div>
                                                    <div><strong>Query:</strong></div>
                                                    <div class="copy-box" style="margin-top: 5px;">
                                                        <button class="copy-btn" onclick="copyToClipboard('kbTable${index}_${tIndex}')">📋 Copy</button>
                                                        <pre id="kbTable${index}_${tIndex}" style="background: #fff; padding: 8px; border-radius: 4px; font-size: 12px; overflow-x: auto;">${table.tdQuery || 'Not specified'}</pre>
                                                    </div>
                                                </div>
                                            `).join('') : '<div style="color: #9ca3af;">No tables added</div>'}
                                        </div>
                                    </div>
                                    ` : `
                                    <div class="field">
                                        <span class="field-label">📄 Text Input:</span>
                                        <div class="copy-box">
                                            <button class="copy-btn" onclick="copyToClipboard('kbContent${index}')">📋 Copy</button>
                                            <div id="kbContent${index}" class="kb-content">${kb.content || ''}</div>
                                        </div>
                                    </div>
                                    `}
                                </div>
                            </li>
                        `;
                        }).join('')}
                    </ul>
                `}
            </div>

            <!-- Step 2: Project Configuration -->
            <div class="section" id="project-config">
                <h2 class="section-title">📁 Step 2: Project Configuration</h2>
                <p style="color: #6b7280; margin-bottom: 20px;">Create a project to contain your agent and knowledge bases.</p>

                <div class="field">
                    <span class="field-label">Project Name:</span>
                    <div class="copy-box">
                        <button class="copy-btn" onclick="copyToClipboard('projectName')">📋 Copy</button>
                        <div id="projectName" class="field-value">${agentConfig.projectName || 'Not specified'}</div>
                    </div>
                </div>

                <div class="field">
                    <span class="field-label">Project Type:</span>
                    <div class="field-value">Self-defined</div>
                </div>

                <div class="field">
                    <span class="field-label">Project Description:</span>
                    <div class="copy-box">
                        <button class="copy-btn" onclick="copyToClipboard('projectDesc')">📋 Copy</button>
                        <pre id="projectDesc" class="field-value">${agentConfig.projectDescription || 'Not specified'}</pre>
                    </div>
                </div>

                <div class="field">
                    <span class="field-label">Use Runtime Text Resource:</span>
                    <div class="field-value">☐ Not enabled</div>
                </div>

                <div class="field">
                    <span class="field-label">Use Workflow Executor:</span>
                    <div class="field-value">☐ Not enabled</div>
                </div>
            </div>

            <!-- Step 3: Agent Configuration -->
            <div class="section" id="agent-config">
                <h2 class="section-title">🤖 Step 3: Agent Configuration</h2>
                <p style="color: #6b7280; margin-bottom: 20px;">Configure your agent's basic settings and behavior.</p>

                <div class="field">
                    <span class="field-label">Agent Name:</span>
                    <div class="copy-box">
                        <button class="copy-btn" onclick="copyToClipboard('agentName')">📋 Copy</button>
                        <div id="agentName" class="field-value">${agentConfig.name || 'Not specified'}</div>
                    </div>
                </div>

                <div class="field">
                    <span class="field-label">Model Name:</span>
                    <div class="copy-box">
                        <button class="copy-btn" onclick="copyToClipboard('modelName')">📋 Copy</button>
                        <div id="modelName" class="field-value">${agentConfig.model}</div>
                    </div>
                </div>

                <div class="field">
                    <span class="field-label">Max Tools Iterations:</span>
                    <div class="copy-box">
                        <button class="copy-btn" onclick="copyToClipboard('maxIterations')">📋 Copy</button>
                        <div id="maxIterations" class="field-value">3</div>
                    </div>
                    <p style="font-size: 12px; color: #6b7280; margin-top: 6px;">
                        ℹ️ Maximum number of tool calls (KB lookups, function executions) the agent can make per response. Higher = more thorough but slower. Recommended: 0=no tools, 3=standard, 5-10=complex analysis
                    </p>
                </div>

                <div class="field">
                    <span class="field-label">Temperature:</span>
                    <div class="copy-box">
                        <button class="copy-btn" onclick="copyToClipboard('temperature')">📋 Copy</button>
                        <div id="temperature" class="field-value">${agentConfig.temperature}</div>
                    </div>
                    <p style="font-size: 12px; color: #6b7280; margin-top: 6px;">
                        ℹ️ Controls randomness: 0.0=focused/deterministic, 1.0=creative/varied. Recommended: 0.3-0.5 for analysis, 0.7-0.9 for creative tasks
                    </p>
                </div>

                <div class="field">
                    <span class="field-label">System Prompt:</span>
                    <div class="copy-box">
                        <button class="copy-btn" onclick="copyToClipboard('systemPrompt')">📋 Copy</button>
                        <pre id="systemPrompt" class="field-value">${agentConfig.systemPrompt || 'Not specified'}</pre>
                    </div>
                </div>
            </div>

            <!-- Step 4: Tools Configuration -->
            <div class="section" id="tools">
                <h2 class="section-title">🔧 Step 4: Add Tools</h2>
                <p style="color: #6b7280; margin-bottom: 20px;">Add tools to connect your agent to knowledge bases. Each KB requires one tool.</p>

                ${knowledgeBases.length === 0 ? '<p style="color: #6b7280;">No tools to configure (no knowledge bases created yet)</p>' : `
                    ${knowledgeBases.map((kb, index) => {
                        const toolName = kb.customToolName || `kb_${kb.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
                        const toolDesc = kb.customToolDescription || `Search and retrieve information from the ${kb.name} knowledge base`;
                        return `
                        <div class="field" style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
                            <h3 style="font-size: 16px; font-weight: 600; color: #667eea; margin-bottom: 15px;">
                                <span class="badge">Tool ${index + 1}</span>
                                ${kb.name} Tool
                            </h3>

                            <div style="margin-bottom: 12px;">
                                <strong>Function Name:</strong>
                                <div class="copy-box">
                                    <button class="copy-btn" onclick="copyToClipboard('toolFnName${index}')">📋 Copy</button>
                                    <div id="toolFnName${index}" class="field-value">${toolName}</div>
                                </div>
                            </div>

                            <div style="margin-bottom: 12px;">
                                <strong>Function Description:</strong>
                                <div class="copy-box">
                                    <button class="copy-btn" onclick="copyToClipboard('toolFnDesc${index}')">📋 Copy</button>
                                    <div id="toolFnDesc${index}" class="field-value">${toolDesc}</div>
                                </div>
                            </div>

                            <div style="margin-bottom: 12px;">
                                <strong>Target (Tool Type):</strong>
                                <div class="field-value">Knowledge Base</div>
                            </div>

                            <div style="margin-bottom: 12px;">
                                <strong>Target Knowledge Base:</strong>
                                <div class="copy-box">
                                    <button class="copy-btn" onclick="copyToClipboard('toolTargetKB${index}')">📋 Copy</button>
                                    <div id="toolTargetKB${index}" class="field-value">${kb.name}</div>
                                </div>
                            </div>

                            <div>
                                <strong>Target Function:</strong>
                                <div class="field-value">Read</div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                `}
            </div>

            <!-- Step 5: Output Configuration -->
            <div class="section" id="outputs">
                <h2 class="section-title">📤 Step 5: Add Outputs</h2>
                <p style="color: #6b7280; margin-bottom: 20px;">Configure structured outputs for your agent (optional). Default text output is always available.</p>

                <div class="field" style="background: #fffbeb; padding: 20px; border-radius: 8px; border: 2px solid #fbbf24;">
                    <h3 style="font-size: 16px; font-weight: 600; color: #92400e; margin-bottom: 15px;">
                        💡 Default Output (No Configuration Needed)
                    </h3>
                    <p style="color: #78350f; font-size: 14px; margin: 0;">
                        Your agent will automatically return text responses with markdown formatting support.
                        Only configure custom outputs if you need structured JSON data or special artifacts like Plotly charts.
                    </p>
                </div>

                ${outputs.length > 0 ? outputs.map((output, i) => {
                    const functionName = output.customFunctionName || output.functionName || 'generate_output';
                    const functionDescription = output.customFunctionDescription || output.functionDescription || '';
                    const jsonSchema = output.customJsonSchema || output.jsonSchema || '';
                    const isPlotly = output.outputName === ':plotly:';
                    const displayName = isPlotly ? 'Plotly Chart' : output.outputName;

                    return `
                <div class="field" style="margin-top: 20px;">
                    <h4 style="font-weight: 600; margin-bottom: 10px;">${isPlotly ? '📊 ' : '📦 '}Output ${i + 1}: ${displayName}</h4>
                    <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
                        <div style="margin-bottom: 12px;">
                            <strong>Output Name:</strong>
                            <div class="copy-box">
                                <button class="copy-btn" onclick="copyToClipboard('output-name-${i}')">📋 Copy</button>
                                <div id="output-name-${i}" class="field-value">${output.outputName}</div>
                            </div>
                        </div>
                        <div style="margin-bottom: 12px;">
                            <strong>Function Name:</strong>
                            <div class="copy-box">
                                <button class="copy-btn" onclick="copyToClipboard('output-func-${i}')">📋 Copy</button>
                                <div id="output-func-${i}" class="field-value">${functionName}</div>
                            </div>
                        </div>
                        ${functionDescription ? `
                        <div style="margin-bottom: 12px;">
                            <strong>Function Description:</strong>
                            <div class="copy-box">
                                <button class="copy-btn" onclick="copyToClipboard('output-desc-${i}')">📋 Copy</button>
                                <div id="output-desc-${i}" class="field-value">${functionDescription}</div>
                            </div>
                        </div>
                        ` : ''}
                        <div style="margin-bottom: 12px;">
                            <strong>Output Type:</strong>
                            <div class="field-value">${output.outputType === 'custom' ? 'Custom (JSON)' : 'Artifact'}</div>
                        </div>
                        ${output.outputType === 'artifact' ? `
                        <div style="margin-bottom: 12px;">
                            <strong>Artifact Type:</strong>
                            <div class="field-value">${output.artifactType}${isPlotly ? ' (for Plotly charts)' : ''}</div>
                        </div>
                        ` : ''}
                        ${output.outputType === 'custom' && jsonSchema ? `
                        <div>
                            <strong>JSON Schema:</strong>
                            <div class="copy-box">
                                <button class="copy-btn" onclick="copyToClipboard('output-schema-${i}')">📋 Copy</button>
                                <pre id="output-schema-${i}" class="field-value" style="max-height: 200px; overflow-y: auto; font-size: 12px;">${(() => {
                                    try {
                                        const parsed = typeof jsonSchema === 'string' ? JSON.parse(jsonSchema) : jsonSchema;
                                        return JSON.stringify(parsed, null, 2);
                                    } catch (e) {
                                        return jsonSchema;
                                    }
                                })()}</pre>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                    `;
                }).join('') : `
                <div class="field" style="margin-top: 20px; background: #f3f4f6; padding: 20px; border-radius: 8px;">
                    <p style="color: #6b7280; text-align: center; margin: 0;">No custom outputs configured. Using default text output only.</p>
                </div>
                `}
            </div>

            <!-- Complete Configuration Summary -->
            <div class="section" id="summary">
                <h2 class="section-title">📋 Complete Configuration Summary</h2>
                <p style="color: #6b7280; margin-bottom: 20px;">Full configuration in JSON format for reference or programmatic deployment.</p>

                <div class="copy-box">
                    <button class="copy-btn" onclick="copyToClipboard('fullConfig')">📋 Copy JSON</button>
                    <pre id="fullConfig" class="field-value" style="max-height: 400px; overflow-y: auto;">${JSON.stringify({
                        agent: {
                            name: agentConfig.name,
                            systemPrompt: agentConfig.systemPrompt,
                            model: agentConfig.model,
                            temperature: agentConfig.temperature
                        },
                        project: {
                            name: agentConfig.projectName,
                            description: agentConfig.projectDescription
                        },
                        knowledgeBases: knowledgeBases.map((kb, index) => {
                            const baseKB = {
                                id: index + 1,
                                name: kb.name,
                                description: kb.description,
                                toolId: 'kb_' + kb.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
                                type: kb.type || 'text'
                            };

                            if (kb.type === 'database') {
                                return {
                                    ...baseKB,
                                    database: kb.database,
                                    tables: kb.tables || []
                                };
                            } else {
                                return {
                                    ...baseKB,
                                    content: kb.content
                                };
                            }
                        }),
                        tools: knowledgeBases.map((kb, index) => ({
                            id: 'kb_' + kb.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
                            name: kb.name,
                            type: 'knowledge_base',
                            description: 'Access knowledge about ' + kb.name
                        })),
                        outputs: outputs.map(output => ({
                            outputName: output.outputName,
                            functionName: output.customFunctionName || output.functionName,
                            functionDescription: output.customFunctionDescription || output.functionDescription,
                            outputType: output.outputType,
                            artifactType: output.artifactType,
                            jsonSchema: output.customJsonSchema || output.jsonSchema
                        }))
                    }, null, 2)}</pre>
                </div>
            </div>
        </div>

        <div class="footer">
            <p><strong>💡 Usage Instructions:</strong></p>
            <p style="margin-top: 10px;">Click the "📋 Copy" buttons to copy any section directly to your clipboard.<br>
            Paste these values into Agent Foundry to configure your agent.</p>
            <p style="margin-top: 20px; font-size: 14px;">Generated by Agent Foundry Assistant</p>
        </div>
    </div>

    <script>
        function copyToClipboard(elementId) {
            const element = document.getElementById(elementId);
            // Use textContent to preserve whitespace and formatting in <pre> tags
            const text = element.textContent;

            navigator.clipboard.writeText(text).then(() => {
                // Find the button that was clicked
                const button = element.parentElement.querySelector('.copy-btn');
                const originalText = button.textContent;

                // Show success feedback
                button.textContent = '✅ Copied!';
                button.style.background = '#10b981';

                // Reset after 2 seconds
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = '#667eea';
                }, 2000);
            }).catch(err => {
                alert(getTranslation('validation.copy.failed', 'Failed to copy: ') + err);
            });
        }
    </script>

    <!-- Back to Top Button -->
    <a href="#top" class="back-to-top" title="Back to top">↑</a>
</body>
</html>
    `;

    // Open in new window
    const newWindow = window.open('', '_blank');
    newWindow.document.write(htmlContent);
    newWindow.document.close();

    addChatMessage('assistant', '📄 <strong>Output webpage opened!</strong> You can now easily copy and paste any section directly to Agent Foundry.');
}

function downloadAllFiles() {
    downloadKnowledgeBases();
    setTimeout(() => downloadProjectConfig(), 500);
    setTimeout(() => downloadAgentConfig(), 1000);

    setTimeout(() => {
        // Calculate final statistics
        const totalTime = wizardStats.endTime && wizardStats.startTime
            ? formatDuration(wizardStats.endTime - wizardStats.startTime)
            : 'N/A';

        addChatMessage('assistant', `🎉 <strong>All files downloaded successfully!</strong><br><br>
        You now have:<br>
        • ${knowledgeBases.length} knowledge base .md files<br>
        • PROJECT_SETUP.md<br>
        • AGENT_CONFIG.md (includes Tools, Outputs, Prompt Variables guidance)<br><br>
        📊 <strong>Session Summary:</strong><br>
        • Total Time: ${totalTime}<br>
        • Tokens Used: ${wizardStats.totalTokensUsed.toLocaleString()}<br>
        • Estimated Cost: $${wizardStats.estimatedCost.toFixed(4)}<br>
        • API Calls: ${wizardStats.aiApiCalls}<br><br>
        📚 <strong>Additional Features:</strong><br>
        The AGENT_CONFIG.md file includes optional sections for:<br>
        • Adding Tools (Agent, Image Generator, Workflow Executor)<br>
        • Configuring Outputs (JSON, Text, React/Plotly visualizations)<br>
        • Setting up Prompt Variables (dynamic data injection)<br><br>
        Check your Downloads folder and follow the guides to deploy your agent to Agent Foundry!`);
    }, 1500);
}

// Download all files as a ZIP archive
// Helper function to generate project configuration content
function generateProjectConfigContent() {
    return `# Project Setup Guide

## Project Information

**Project Name:** ${agentConfig.projectName}

**Description:**
${agentConfig.projectDescription}

## Knowledge Bases

This project includes ${knowledgeBases.length} knowledge bases:
${knowledgeBases.map((kb, i) => `${i + 1}. ${kb.name}`).join('\n')}

## Setup Steps for Agent Foundry

### 1. Create Project
1. Log into Treasure Data Console
2. Navigate to AI Agent Foundry
3. Click "Create Project"
4. Enter project name: **${agentConfig.projectName}**
5. Enter description: **${agentConfig.projectDescription}**
6. Click "Create"

### 2. Upload Knowledge Bases
1. In your project, go to "Knowledge Bases"
2. Click "Upload Knowledge Base"
3. Upload each of the ${knowledgeBases.length} .md files you downloaded
4. Wait for indexing to complete (5-10 minutes per file)
5. Verify all knowledge bases are "Active"

### 3. Configure Agent
Follow the instructions in **AGENT_CONFIG.md** to:
- Create the agent
- Set model and temperature
- Add system prompt
- Configure knowledge base tools
- Set output preferences

### 4. Test Agent
1. Use the built-in test console
2. Try sample queries related to your knowledge bases
3. Verify responses are accurate and helpful
4. Adjust configuration if needed

### 5. Deploy
1. Review all settings
2. Click "Deploy"
3. Note the agent endpoint URL
4. Integrate with your application

---

**Generated by:** PM Agent Squad Master - AI-Powered Agent Builder
**Created:** ${new Date().toLocaleDateString()}
`;
}

// Helper function to generate agent configuration content
function generateAgentConfigContent() {
    const tools = knowledgeBases.map((kb, i) => ({
        name: kb.customToolName || `kb_${kb.name.toLowerCase().replace(/\s+/g, '_')}`,
        description: kb.customToolDescription || `Search and retrieve information from ${kb.name}`,
        type: 'knowledge-base'
    }));

    return `# Agent Configuration Guide

## Agent Details

**Agent Name:** ${agentConfig.name}
**Model:** ${agentConfig.model}
**Temperature:** ${agentConfig.temperature}
**Max Tools Iterations:** ${agentConfig.maxToolsIterations}

## System Prompt

${agentConfig.systemPrompt}

## Knowledge Base Tools

${tools.map((tool, i) => `### Tool ${i + 1}: ${tool.name}

**Description:** ${tool.description}
**Type:** ${tool.type}
**Knowledge Base:** ${knowledgeBases[i].name}
`).join('\n')}

## Configuration Steps in Agent Foundry

### 1. Create Agent
1. In your project, click "Create Agent"
2. Enter agent name: **${agentConfig.name}**
3. Select model: **${agentConfig.model}**
4. Set temperature: **${agentConfig.temperature}**
5. Set max tools iterations: **${agentConfig.maxToolsIterations}**
6. Click "Next"

### 2. Add System Prompt
1. In the "Instructions" section
2. Paste the system prompt above
3. Review and ensure it matches your requirements
4. Click "Save"

### 3. Add Knowledge Base Tools
For each knowledge base, add a tool:

${tools.map((tool, i) => `**${tool.name}:**
- Tool Type: Knowledge Base
- Knowledge Base: Select "${knowledgeBases[i].name}"
- Description: "${tool.description}"
`).join('\n')}

### 4. Add Additional Tools (Optional)

${additionalTools.length > 0 ? `**Your Configured Tools:**

${additionalTools.map((tool, i) => `**Tool ${i + 1}: ${tool.functionName || 'Unnamed Tool'}**
- Function Name: ${tool.functionName}
- Function Description: ${tool.functionDescription}
- Tool Type: ${tool.type === 'agent' ? 'Agent' : tool.type === 'image_generator' ? 'Image Generator' : 'Workflow Executor'}
${tool.type === 'agent' ? `- Target Agent: ${tool.targetAgent}` : ''}
${tool.type === 'image_generator' ? `- Image Format: ${tool.imageFormat}` : ''}
${tool.type === 'workflow' ? `- Workflow ARN: ${tool.workflowArn}` : ''}
- Output Mode: ${tool.outputMode === 'return' ? 'Return (Agent processes result)' : 'Stream (Direct to user)'}
`).join('\n')}

**To add these tools in Agent Foundry:**
1. Navigate to the "Tools" section
2. Click "Add Tool"
3. Select the tool type and fill in the details above
4. Save each tool configuration
` : `Agent Foundry supports additional tool types beyond Knowledge Base:

**Tool Types Available:**
- **Knowledge Base** - Query structured data (already added above)
- **Agent** - Call another agent for specialized tasks
- **Image Generator** - Create/edit images
- **Workflow Executor** - Run complex workflows

**Example: Add Agent Tool**
- Function Name: create_email_draft
- Function Description: Creates professional email draft based on campaign brief
- Target: Agent
- Target Agent: Email_Creator_Agent
- Output Mode: Return
`}
**See:** 04_Add_Tools_Guide.md for detailed tool configuration

### 5. Configure Outputs (Optional)

${outputs.length > 0 ? `**Your Configured Outputs:**

${outputs.map((output, i) => {
    const functionName = output.customFunctionName || output.functionName || 'generate_output';
    const functionDescription = output.customFunctionDescription || output.functionDescription || '';
    const jsonSchema = output.customJsonSchema || output.jsonSchema || '';

    return `**Output ${i + 1}: ${output.outputName || 'Unnamed Output'}**
- Output Name: ${output.outputName}
- Function Name: ${functionName}
${functionDescription ? `- Description: ${functionDescription}` : ''}
- Output Type: ${output.outputType === 'custom' ? 'Custom (JSON)' : 'Artifact'}
${output.outputType === 'artifact' ? `- Artifact Type: ${output.artifactType}` : ''}
${output.outputType === 'custom' && jsonSchema ? `- JSON Schema:
  ${jsonSchema}` : ''}`;
}).join('\n\n')}

**To add these outputs in Agent Foundry:**
1. Navigate to the "Outputs" section
2. Click "Add Output"
3. Fill in the details above
4. For Custom outputs, paste the JSON schema
5. Save each output configuration
` : `Define how your agent returns structured information:

**Output Types:**
- **Custom (JSON)** - Structured data for APIs, databases
- **Artifact (Text)** - Formatted documents, reports
- **Artifact (Image)** - Visual content
- **Artifact (React)** - Interactive visualizations, dashboards

**Example: Campaign Plan Output (JSON Schema)**
- outputName: campaign_plan
- functionName: generate_campaign_plan
- outputType: Custom
- jsonSchema properties: campaign_name (string), budget (number), platforms (array)

**Special Output: :plotly:**
Name an output ":plotly:" to auto-render as interactive Plotly chart
`}
**See:** 05_Add_Output_Guide.md for examples and React/Plotly code

### 6. Add Prompt Variables (Optional)

${promptVariables.length > 0 ? `**Your Configured Prompt Variables:**

${promptVariables.map((variable, i) => `**Variable ${i + 1}: ${variable.variableName || 'Unnamed Variable'}**
- Variable Name: ${variable.variableName}
- Target Knowledge Base: ${variable.targetKnowledgeBase}
- Target Function: ${variable.targetFunction}
- List of Variables: ${variable.listOfVariables}
`).join('\n')}

**To add these prompt variables in Agent Foundry:**
1. Navigate to the "Prompt Variables" section
2. Click "Add Variable"
3. Fill in the details above
4. Save each variable configuration
5. Reference in prompts using {{${promptVariables[0]?.variableName || 'variable_name'}}}
` : `Dynamically inject data from knowledge bases into prompts:

**Variable Syntax Examples:**
- customers (all columns from customers table)
- products.{sku,name,price} (only specified columns)
- behavior_*.* (all columns from tables starting with "behavior_")
- !*.internal_* (exclude columns starting with "internal_")

**Configuration:**
- Variable Name: database_schema
- Target Knowledge Base: Campaign_Performance_DB
- Target Function: List columns
- List of Variables: campaigns, metrics.{impressions,clicks,conversions}
`}
**See:** 06_Add_Prompt_Variables_Guide.md for detailed syntax

### 7. Test Agent
Sample test queries:
${tools.slice(0, 3).map((tool, i) => `- "Tell me about ${knowledgeBases[i].name.toLowerCase()}"`).join('\n')}
- "What can you help me with?"
- (Add domain-specific test queries)

### 8. Review and Deploy
1. Review all configuration
2. Run test queries
3. Verify knowledge base responses
4. Test tools and outputs (if added)
5. Click "Deploy"
6. Note agent ID and endpoint

---

**Agent Configuration Complete!**

Your agent is now ready to:
${knowledgeBases.slice(0, 5).map((kb, i) => `- Provide information from ${kb.name}`).join('\n')}

**Generated by:** PM Agent Squad Master - AI-Powered Agent Builder
**Created:** ${new Date().toLocaleDateString()}
`;
}

async function downloadAllFilesAsZip() {
    try {
        const zip = new JSZip();
        const agentSlug = (agentConfig.agentName || agentConfig.name || 'Agent').replace(/\s+/g, '_');

        // Add knowledge base files
        knowledgeBases.forEach((kb, index) => {
            const filename = `${agentSlug}_KB${index + 1}_${kb.name.replace(/\s+/g, '_')}.md`;
            const content = generateKBFile(kb);
            zip.file(filename, content);
        });

        // Add project setup guide
        const projectContent = generateProjectConfigContent();
        zip.file('PROJECT_SETUP.md', projectContent);

        // Add agent configuration
        const agentContent = generateAgentConfigContent();
        zip.file('AGENT_CONFIG.md', agentContent);

        // Generate ZIP file
        const blob = await zip.generateAsync({ type: 'blob' });

        // Download ZIP file
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${agentSlug}_Complete_Package.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Calculate final statistics
        const totalTime = wizardStats.endTime && wizardStats.startTime
            ? formatDuration(wizardStats.endTime - wizardStats.startTime)
            : 'N/A';

        addChatMessage('assistant', `🎉 <strong>ZIP package downloaded successfully!</strong><br><br>
        You now have:<br>
        • ${knowledgeBases.length} knowledge base .md files<br>
        • PROJECT_SETUP.md<br>
        • AGENT_CONFIG.md (includes Tools, Outputs, Prompt Variables guidance)<br>
        • All packaged in: <strong>${agentSlug}_Complete_Package.zip</strong><br><br>
        📊 <strong>Session Summary:</strong><br>
        • Total Time: ${totalTime}<br>
        • Tokens Used: ${wizardStats.totalTokensUsed.toLocaleString()}<br>
        • Estimated Cost: $${wizardStats.estimatedCost.toFixed(4)}<br>
        • API Calls: ${wizardStats.aiApiCalls}<br><br>
        📚 <strong>Additional Features:</strong><br>
        The AGENT_CONFIG.md file includes optional sections for:<br>
        • Adding Tools (Agent, Image Generator, Workflow Executor)<br>
        • Configuring Outputs (JSON, Text, React/Plotly visualizations)<br>
        • Setting up Prompt Variables (dynamic data injection)<br><br>
        Extract the ZIP file and follow the guides to deploy your agent to Agent Foundry!`);
    } catch (error) {
        console.error('Error creating ZIP file:', error);
        addChatMessage('assistant', '❌ Failed to create ZIP file. Please try downloading files individually.');
    }
}

// Share output webpage
function shareOutputWebpage() {
    // Generate the output webpage HTML
    const htmlContent = generateOutputWebpageHTML();
    const agentSlug = (agentConfig.agentName || agentConfig.name || 'Agent').replace(/\s+/g, '_');

    // Create a blob and download as HTML file
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${agentSlug}_Configuration.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Also open in new tab for preview
    const previewUrl = URL.createObjectURL(blob);
    window.open(previewUrl, '_blank');

    // Show success message with clear instructions
    addChatMessage('assistant', `📄 <strong>Configuration HTML downloaded!</strong><br><br>
    ✅ File saved as: <strong>${agentSlug}_Configuration.html</strong><br><br>
    <strong>📧 How to share with colleagues:</strong><br>
    1. Find the downloaded HTML file in your Downloads folder<br>
    2. Send it via email, Slack, Teams, or any file sharing service<br>
    3. Your colleague can open it in <strong>any web browser</strong> (Chrome, Firefox, Safari, Edge)<br>
    4. No server or special software required - it's a standalone HTML file!<br><br>
    <strong>💡 What they'll see:</strong><br>
    • Complete agent configuration with copy-paste ready values<br>
    • All knowledge bases with formatted content<br>
    • Project settings and system prompts<br>
    • Tools and outputs configuration<br>
    • Easy navigation and copy buttons for each section<br><br>
    <strong>🔍 Preview:</strong> The file has also been opened in a new tab for you to review before sharing.`);
}

// Helper function to generate output webpage HTML (extracted from viewOutputWebpage)
function generateOutputWebpageHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${agentConfig.name || 'Agent'} - Configuration Output</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html {
            scroll-behavior: smooth;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }

        .header h1 {
            font-size: 36px;
            font-weight: 700;
            margin-bottom: 10px;
        }

        .header p {
            font-size: 18px;
            opacity: 0.9;
        }

        .content {
            padding: 40px;
        }

        .section {
            margin-bottom: 40px;
            padding: 30px;
            background: #f9fafb;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
        }

        .section-title {
            font-size: 24px;
            font-weight: 600;
            color: #667eea;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
        }

        .copy-box {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-top: 15px;
            position: relative;
        }

        .copy-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #667eea;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
        }

        .copy-btn:hover {
            background: #5a67d8;
            transform: translateY(-2px);
        }

        .copy-btn:active {
            transform: translateY(0);
        }

        .field {
            margin-bottom: 20px;
        }

        .field-label {
            font-weight: 600;
            color: #4b5563;
            margin-bottom: 8px;
            display: block;
        }

        .field-value {
            background: white;
            padding: 12px;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
            font-family: 'Courier New', monospace;
            color: #1f2937;
        }

        .kb-list {
            list-style: none;
        }

        .kb-item {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 15px;
            border: 1px solid #e5e7eb;
        }

        .kb-name {
            font-weight: 600;
            color: #667eea;
            margin-bottom: 10px;
            font-size: 18px;
        }

        .kb-desc {
            color: #6b7280;
            margin-bottom: 10px;
            font-size: 14px;
        }

        .kb-content {
            background: #f9fafb;
            padding: 15px;
            border-radius: 6px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            white-space: pre-wrap;
            word-wrap: break-word;
            max-height: 300px;
            overflow-y: auto;
        }

        .badge {
            display: inline-block;
            padding: 4px 12px;
            background: #667eea;
            color: white;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            margin-right: 8px;
        }

        .footer {
            text-align: center;
            padding: 30px;
            background: #f9fafb;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
        }

        pre {
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        /* Navigation Styles */
        .nav-bar {
            position: sticky;
            top: 0;
            background: white;
            border-bottom: 3px solid #667eea;
            padding: 15px 20px;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .nav-container {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
        }

        .nav-label {
            font-weight: 600;
            color: #667eea;
            margin-right: 10px;
            font-size: 14px;
        }

        .nav-link {
            display: inline-block;
            padding: 8px 16px;
            background: #f3f4f6;
            color: #4b5563;
            text-decoration: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s;
            border: 1px solid #e5e7eb;
        }

        .nav-link:hover {
            background: #667eea;
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }

        .nav-link:active {
            transform: translateY(0);
        }

        .back-to-top {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #667eea;
            color: white;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            font-size: 24px;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            transition: all 0.3s;
            z-index: 999;
        }

        .back-to-top:hover {
            background: #5a67d8;
            transform: translateY(-5px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header" id="top">
            <h1>🤖 ${agentConfig.name || 'AI Agent'}</h1>
            <p>Configuration Output - Ready for Agent Foundry</p>
        </div>

        <!-- Sticky Navigation Bar -->
        <nav class="nav-bar">
            <div class="nav-container">
                <span class="nav-label">Jump to:</span>
                <a href="#knowledge-bases" class="nav-link">📚 Knowledge Bases</a>
                <a href="#project-config" class="nav-link">📁 Project</a>
                <a href="#agent-config" class="nav-link">🤖 Agent</a>
                <a href="#tools" class="nav-link">🔧 Tools</a>
                <a href="#outputs" class="nav-link">📤 Outputs</a>
                <a href="#summary" class="nav-link">📋 Summary</a>
            </div>
        </nav>

        <div class="content">
            <!-- Step 1: Knowledge Bases (Detailed) -->
            <div class="section" id="knowledge-bases">
                <h2 class="section-title">📚 Knowledge Bases (${knowledgeBases.length})</h2>
                <p style="color: #6b7280; margin-bottom: 20px;">Each knowledge base provides specialized expertise to your agent. Copy each section to create the knowledge base in Agent Foundry.</p>

                ${knowledgeBases.length === 0 ? '<p style="color: #6b7280;">No knowledge bases configured</p>' : `
                    <ul class="kb-list">
                        ${knowledgeBases.map((kb, index) => {
                            const toolId = kb.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                            return `
                            <li class="kb-item">
                                <div class="kb-name">
                                    <span class="badge">KB ${index + 1}</span>
                                    ${kb.name}
                                </div>
                                <div style="margin-top: 15px;">
                                    <div class="field">
                                        <span class="field-label">📝 Knowledge Base Name:</span>
                                        <div class="copy-box">
                                            <button class="copy-btn" onclick="copyToClipboard('kbName${index}')">📋 Copy</button>
                                            <div id="kbName${index}" class="field-value">${kb.name}</div>
                                        </div>
                                    </div>

                                    ${kb.type === 'database' ? `
                                    <div class="field">
                                        <span class="field-label">🗄️ Database:</span>
                                        <div class="copy-box">
                                            <button class="copy-btn" onclick="copyToClipboard('kbDatabase${index}')">📋 Copy</button>
                                            <div id="kbDatabase${index}" class="field-value">${kb.database || 'Not specified'}</div>
                                        </div>
                                    </div>

                                    <div class="field">
                                        <span class="field-label">📊 Tables:</span>
                                        <div style="margin-left: 20px;">
                                            ${kb.tables && kb.tables.length > 0 ? kb.tables.map((table, tIndex) => `
                                                <div style="margin-bottom: 15px; padding: 10px; background: #f9fafb; border-radius: 6px;">
                                                    <div style="font-weight: 600; margin-bottom: 8px;">Table ${tIndex + 1}: ${table.name || 'Untitled'}</div>
                                                    <div style="margin-bottom: 5px;"><strong>Table Name:</strong> ${table.tableName || 'Not specified'}</div>
                                                    <div><strong>Query:</strong></div>
                                                    <div class="copy-box" style="margin-top: 5px;">
                                                        <button class="copy-btn" onclick="copyToClipboard('kbTable${index}_${tIndex}')">📋 Copy</button>
                                                        <pre id="kbTable${index}_${tIndex}" style="background: #fff; padding: 8px; border-radius: 4px; font-size: 12px; overflow-x: auto;">${table.tdQuery || 'Not specified'}</pre>
                                                    </div>
                                                </div>
                                            `).join('') : '<div style="color: #9ca3af;">No tables added</div>'}
                                        </div>
                                    </div>
                                    ` : `
                                    <div class="field">
                                        <span class="field-label">📄 Text Input:</span>
                                        <div class="copy-box">
                                            <button class="copy-btn" onclick="copyToClipboard('kbContent${index}')">📋 Copy</button>
                                            <div id="kbContent${index}" class="kb-content">${kb.content || ''}</div>
                                        </div>
                                    </div>
                                    `}
                                </div>
                            </li>
                        `;
                        }).join('')}
                    </ul>
                `}
            </div>

            <!-- Step 2: Project Configuration -->
            <div class="section" id="project-config">
                <h2 class="section-title">📁 Step 2: Project Configuration</h2>
                <p style="color: #6b7280; margin-bottom: 20px;">Create a project to contain your agent and knowledge bases.</p>

                <div class="field">
                    <span class="field-label">Project Name:</span>
                    <div class="copy-box">
                        <button class="copy-btn" onclick="copyToClipboard('projectName')">📋 Copy</button>
                        <div id="projectName" class="field-value">${agentConfig.projectName || 'Not specified'}</div>
                    </div>
                </div>

                <div class="field">
                    <span class="field-label">Project Type:</span>
                    <div class="field-value">Self-defined</div>
                </div>

                <div class="field">
                    <span class="field-label">Project Description:</span>
                    <div class="copy-box">
                        <button class="copy-btn" onclick="copyToClipboard('projectDesc')">📋 Copy</button>
                        <pre id="projectDesc" class="field-value">${agentConfig.projectDescription || 'Not specified'}</pre>
                    </div>
                </div>

                <div class="field">
                    <span class="field-label">Use Runtime Text Resource:</span>
                    <div class="field-value">☐ Not enabled</div>
                </div>

                <div class="field">
                    <span class="field-label">Use Workflow Executor:</span>
                    <div class="field-value">☐ Not enabled</div>
                </div>
            </div>

            <!-- Step 3: Agent Configuration -->
            <div class="section" id="agent-config">
                <h2 class="section-title">🤖 Step 3: Agent Configuration</h2>
                <p style="color: #6b7280; margin-bottom: 20px;">Configure your agent's basic settings and behavior.</p>

                <div class="field">
                    <span class="field-label">Agent Name:</span>
                    <div class="copy-box">
                        <button class="copy-btn" onclick="copyToClipboard('agentName')">📋 Copy</button>
                        <div id="agentName" class="field-value">${agentConfig.name || 'Not specified'}</div>
                    </div>
                </div>

                <div class="field">
                    <span class="field-label">Model Name:</span>
                    <div class="copy-box">
                        <button class="copy-btn" onclick="copyToClipboard('modelName')">📋 Copy</button>
                        <div id="modelName" class="field-value">${agentConfig.model}</div>
                    </div>
                </div>

                <div class="field">
                    <span class="field-label">Max Tools Iterations:</span>
                    <div class="copy-box">
                        <button class="copy-btn" onclick="copyToClipboard('maxIterations')">📋 Copy</button>
                        <div id="maxIterations" class="field-value">3</div>
                    </div>
                    <p style="font-size: 12px; color: #6b7280; margin-top: 6px;">
                        ℹ️ Maximum number of tool calls (KB lookups, function executions) the agent can make per response. Higher = more thorough but slower. Recommended: 0=no tools, 3=standard, 5-10=complex analysis
                    </p>
                </div>

                <div class="field">
                    <span class="field-label">Temperature:</span>
                    <div class="copy-box">
                        <button class="copy-btn" onclick="copyToClipboard('temperature')">📋 Copy</button>
                        <div id="temperature" class="field-value">${agentConfig.temperature}</div>
                    </div>
                    <p style="font-size: 12px; color: #6b7280; margin-top: 6px;">
                        ℹ️ Controls randomness: 0.0=focused/deterministic, 1.0=creative/varied. Recommended: 0.3-0.5 for analysis, 0.7-0.9 for creative tasks
                    </p>
                </div>

                <div class="field">
                    <span class="field-label">System Prompt:</span>
                    <div class="copy-box">
                        <button class="copy-btn" onclick="copyToClipboard('systemPrompt')">📋 Copy</button>
                        <pre id="systemPrompt" class="field-value">${agentConfig.systemPrompt || 'Not specified'}</pre>
                    </div>
                </div>
            </div>

            <!-- Step 4: Tools Configuration -->
            <div class="section" id="tools">
                <h2 class="section-title">🔧 Step 4: Add Tools</h2>
                <p style="color: #6b7280; margin-bottom: 20px;">Add tools to connect your agent to knowledge bases. Each KB requires one tool.</p>

                ${knowledgeBases.length === 0 ? '<p style="color: #6b7280;">No tools to configure (no knowledge bases created yet)</p>' : `
                    ${knowledgeBases.map((kb, index) => {
                        const toolName = kb.customToolName || `kb_${kb.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
                        const toolDesc = kb.customToolDescription || `Search and retrieve information from the ${kb.name} knowledge base`;
                        return `
                        <div class="field" style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
                            <h3 style="font-size: 16px; font-weight: 600; color: #667eea; margin-bottom: 15px;">
                                <span class="badge">Tool ${index + 1}</span>
                                ${kb.name} Tool
                            </h3>

                            <div style="margin-bottom: 12px;">
                                <strong>Function Name:</strong>
                                <div class="copy-box">
                                    <button class="copy-btn" onclick="copyToClipboard('toolFnName${index}')">📋 Copy</button>
                                    <div id="toolFnName${index}" class="field-value">${toolName}</div>
                                </div>
                            </div>

                            <div style="margin-bottom: 12px;">
                                <strong>Function Description:</strong>
                                <div class="copy-box">
                                    <button class="copy-btn" onclick="copyToClipboard('toolFnDesc${index}')">📋 Copy</button>
                                    <div id="toolFnDesc${index}" class="field-value">${toolDesc}</div>
                                </div>
                            </div>

                            <div style="margin-bottom: 12px;">
                                <strong>Target (Tool Type):</strong>
                                <div class="field-value">Knowledge Base</div>
                            </div>

                            <div style="margin-bottom: 12px;">
                                <strong>Target Knowledge Base:</strong>
                                <div class="copy-box">
                                    <button class="copy-btn" onclick="copyToClipboard('toolTargetKB${index}')">📋 Copy</button>
                                    <div id="toolTargetKB${index}" class="field-value">${kb.name}</div>
                                </div>
                            </div>

                            <div>
                                <strong>Target Function:</strong>
                                <div class="field-value">Read</div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                `}
            </div>

            <!-- Step 5: Output Configuration -->
            <div class="section" id="outputs">
                <h2 class="section-title">📤 Step 5: Add Outputs</h2>
                <p style="color: #6b7280; margin-bottom: 20px;">Configure structured outputs for your agent (optional). Default text output is always available.</p>

                <div class="field" style="background: #fffbeb; padding: 20px; border-radius: 8px; border: 2px solid #fbbf24;">
                    <h3 style="font-size: 16px; font-weight: 600; color: #92400e; margin-bottom: 15px;">
                        💡 Default Output (No Configuration Needed)
                    </h3>
                    <p style="color: #78350f; font-size: 14px; margin: 0;">
                        Your agent will automatically return text responses with markdown formatting support.
                        Only configure custom outputs if you need structured JSON data or special artifacts like Plotly charts.
                    </p>
                </div>

                ${outputs.length > 0 ? outputs.map((output, i) => {
                    const functionName = output.customFunctionName || output.functionName || 'generate_output';
                    const functionDescription = output.customFunctionDescription || output.functionDescription || '';
                    const jsonSchema = output.customJsonSchema || output.jsonSchema || '';
                    const isPlotly = output.outputName === ':plotly:';
                    const displayName = isPlotly ? 'Plotly Chart' : output.outputName;

                    return `
                <div class="field" style="margin-top: 20px;">
                    <h4 style="font-weight: 600; margin-bottom: 10px;">${isPlotly ? '📊 ' : '📦 '}Output ${i + 1}: ${displayName}</h4>
                    <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
                        <div style="margin-bottom: 12px;">
                            <strong>Output Name:</strong>
                            <div class="copy-box">
                                <button class="copy-btn" onclick="copyToClipboard('output-name-${i}')">📋 Copy</button>
                                <div id="output-name-${i}" class="field-value">${output.outputName}</div>
                            </div>
                        </div>
                        <div style="margin-bottom: 12px;">
                            <strong>Function Name:</strong>
                            <div class="copy-box">
                                <button class="copy-btn" onclick="copyToClipboard('output-func-${i}')">📋 Copy</button>
                                <div id="output-func-${i}" class="field-value">${functionName}</div>
                            </div>
                        </div>
                        ${functionDescription ? `
                        <div style="margin-bottom: 12px;">
                            <strong>Function Description:</strong>
                            <div class="copy-box">
                                <button class="copy-btn" onclick="copyToClipboard('output-desc-${i}')">📋 Copy</button>
                                <div id="output-desc-${i}" class="field-value">${functionDescription}</div>
                            </div>
                        </div>
                        ` : ''}
                        <div style="margin-bottom: 12px;">
                            <strong>Output Type:</strong>
                            <div class="field-value">${output.outputType === 'custom' ? 'Custom (JSON)' : 'Artifact'}</div>
                        </div>
                        ${output.outputType === 'artifact' ? `
                        <div style="margin-bottom: 12px;">
                            <strong>Artifact Type:</strong>
                            <div class="field-value">${output.artifactType}${isPlotly ? ' (for Plotly charts)' : ''}</div>
                        </div>
                        ` : ''}
                        ${output.outputType === 'custom' && jsonSchema ? `
                        <div>
                            <strong>JSON Schema:</strong>
                            <div class="copy-box">
                                <button class="copy-btn" onclick="copyToClipboard('output-schema-${i}')">📋 Copy</button>
                                <pre id="output-schema-${i}" class="field-value" style="max-height: 200px; overflow-y: auto; font-size: 12px;">${(() => {
                                    try {
                                        const parsed = typeof jsonSchema === 'string' ? JSON.parse(jsonSchema) : jsonSchema;
                                        return JSON.stringify(parsed, null, 2);
                                    } catch (e) {
                                        return jsonSchema;
                                    }
                                })()}</pre>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                    `;
                }).join('') : `
                <div class="field" style="margin-top: 20px; background: #f3f4f6; padding: 20px; border-radius: 8px;">
                    <p style="color: #6b7280; text-align: center; margin: 0;">No custom outputs configured. Using default text output only.</p>
                </div>
                `}
            </div>

            <!-- Complete Configuration Summary -->
            <div class="section" id="summary">
                <h2 class="section-title">📋 Complete Configuration Summary</h2>
                <p style="color: #6b7280; margin-bottom: 20px;">Full configuration in JSON format for reference or programmatic deployment.</p>

                <div class="copy-box">
                    <button class="copy-btn" onclick="copyToClipboard('fullConfig')">📋 Copy JSON</button>
                    <pre id="fullConfig" class="field-value" style="max-height: 400px; overflow-y: auto;">${JSON.stringify({
                        agent: {
                            name: agentConfig.name,
                            systemPrompt: agentConfig.systemPrompt,
                            model: agentConfig.model,
                            temperature: agentConfig.temperature
                        },
                        project: {
                            name: agentConfig.projectName,
                            description: agentConfig.projectDescription
                        },
                        knowledgeBases: knowledgeBases.map((kb, index) => {
                            const baseKB = {
                                id: index + 1,
                                name: kb.name,
                                description: kb.description,
                                toolId: 'kb_' + kb.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
                                type: kb.type || 'text'
                            };

                            if (kb.type === 'database') {
                                return {
                                    ...baseKB,
                                    database: kb.database,
                                    tables: kb.tables || []
                                };
                            } else {
                                return {
                                    ...baseKB,
                                    content: kb.content
                                };
                            }
                        }),
                        tools: knowledgeBases.map((kb, index) => ({
                            id: 'kb_' + kb.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
                            name: kb.name,
                            type: 'knowledge_base',
                            description: 'Access knowledge about ' + kb.name
                        })),
                        outputs: outputs.map(output => ({
                            outputName: output.outputName,
                            functionName: output.customFunctionName || output.functionName,
                            functionDescription: output.customFunctionDescription || output.functionDescription,
                            outputType: output.outputType,
                            artifactType: output.artifactType,
                            jsonSchema: output.customJsonSchema || output.jsonSchema
                        }))
                    }, null, 2)}</pre>
                </div>
            </div>
        </div>

        <div class="footer">
            <p><strong>💡 Usage Instructions:</strong></p>
            <p style="margin-top: 10px;">Click the "📋 Copy" buttons to copy any section directly to your clipboard.<br>
            Paste these values into Agent Foundry to configure your agent.</p>
            <p style="margin-top: 20px; font-size: 14px;">Generated by Agent Foundry Assistant</p>
        </div>
    </div>

    <script>
        function copyToClipboard(elementId) {
            const element = document.getElementById(elementId);
            const text = element.innerText || element.textContent;

            navigator.clipboard.writeText(text).then(() => {
                // Find the button that was clicked
                const button = element.parentElement.querySelector('.copy-btn');
                const originalText = button.textContent;

                // Show success feedback
                button.textContent = '✅ Copied!';
                button.style.background = '#10b981';

                // Reset after 2 seconds
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = '#667eea';
                }, 2000);
            }).catch(err => {
                alert('Failed to copy: ' + err);
            });
        }
    </script>

    <!-- Back to Top Button -->
    <a href="#top" class="back-to-top" title="Back to top">↑</a>
</body>
</html>
    `;
}

// Helper function to format duration
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Clear Auto-Saved Work
function clearAutoSave() {
    const saved = localStorage.getItem('agentBuilderAutoSave');

    if (!saved) {
        showToast('No auto-saved work found', 'info');
        return;
    }

    if (confirm('Clear auto-saved work? This will permanently delete your auto-save backup.')) {
        localStorage.removeItem('agentBuilderAutoSave');
        showToast('Auto-saved work cleared successfully', 'success');
        // Reset first save flag so next save shows the toast
        isFirstAutoSave = true;
    }
}

// Handle file attachment
function handleFileAttachment(file) {
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        showToast('File too large. Maximum size is 5MB.', 'error');
        return;
    }

    // Check file type (text files only)
    const allowedTypes = ['.txt', '.md', '.json', '.csv', '.gdoc'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
        showToast('Invalid file type. Allowed: .txt, .md, .json, .csv, .gdoc', 'error');
        return;
    }

    // Read file contents as text
    const reader = new FileReader();
    reader.onload = function(e) {
        let content = e.target.result;
        let displayName = file.name;

        // Handle Google Docs files (.gdoc)
        if (fileExtension === '.gdoc') {
            try {
                const gdocData = JSON.parse(content);
                let docUrl = null;

                // Check for different possible field names
                if (gdocData.url) {
                    docUrl = gdocData.url;
                } else if (gdocData.doc_id) {
                    // Construct URL from doc_id
                    docUrl = `https://docs.google.com/document/d/${gdocData.doc_id}/edit`;
                } else {
                    showToast('Invalid .gdoc file format - missing URL or doc_id', 'error');
                    return;
                }

                // Extract the Google Docs URL
                content = `Google Doc: ${docUrl}\n\nNote: Please share this document publicly or with appropriate permissions for the agent to access it.`;
                displayName = file.name.replace('.gdoc', '') + ' (Google Doc)';
            } catch (error) {
                showToast('Failed to parse .gdoc file: ' + error.message, 'error');
                return;
            }
        }

        currentAttachment = {
            name: displayName,
            content: content,
            type: file.type || 'text/plain',
            isGoogleDoc: fileExtension === '.gdoc'
        };

        // Update UI
        const attachmentNameSpan = document.getElementById('attachmentName');
        const removeBtn = document.getElementById('removeAttachmentBtn');

        if (attachmentNameSpan) {
            attachmentNameSpan.textContent = displayName;
        }
        if (removeBtn) {
            removeBtn.classList.remove('hidden');
        }

        showToast('Attached: ' + displayName, 'success');
    };

    reader.onerror = function() {
        showToast('Failed to read file', 'error');
    };

    reader.readAsText(file);
}

// Clear file attachment
function clearAttachment(silent) {
    if (silent === undefined) silent = false;

    const hadAttachment = currentAttachment !== null;
    currentAttachment = null;

    // Update UI
    const attachmentNameSpan = document.getElementById('attachmentName');
    const removeBtn = document.getElementById('removeAttachmentBtn');
    const fileInput = document.getElementById('chatAttachment');

    if (attachmentNameSpan) {
        attachmentNameSpan.textContent = '';
    }
    if (removeBtn) {
        removeBtn.classList.add('hidden');
    }
    if (fileInput) {
        fileInput.value = '';
    }

    // Only show toast if user explicitly clicked remove and there was an attachment
    if (!silent && hadAttachment) {
        showToast('Attachment removed', 'info');
    }
}

// Reset Wizard
function resetWizard() {
    // Confirm with user
    if (!confirm('Are you sure you want to start over? All current progress will be lost.')) {
        return;
    }

    // Reset state
    currentStep = 0;
    knowledgeBases = [];
    kbCounter = 0;
    agentConfig = {
        description: '',
        tone: 'professional',
        language: 'english',
        audience: '',
        domain: '',
        name: '',
        projectName: '',
        projectDescription: '',
        model: 'anthropic.claude-4.5-sonnet',
        temperature: 0.5,
        systemPrompt: ''
    };
    chatHistory = [];

    // Clear all form inputs
    document.getElementById('agentDescription').value = '';
    document.getElementById('agentTone').value = 'professional';
    document.getElementById('agentAudience').value = '';
    document.getElementById('aiChatInput').value = '';
    document.getElementById('projectName').value = '';
    document.getElementById('projectDescription').value = '';
    document.getElementById('agentName').value = '';
    document.getElementById('modelSelect').value = 'anthropic.claude-4.5-sonnet';
    document.getElementById('temperature').value = 0.5;
    document.getElementById('temperatureInput').value = 0.5;
    document.getElementById('maxToolsIterations').value = 0;
    document.getElementById('maxToolsIterationsInput').value = 0;
    document.getElementById('systemPrompt').value = '';

    // Clear knowledge bases display
    const kbList = document.getElementById('knowledgeBasesList');
    if (kbList) {
        kbList.innerHTML = '<div class="text-center py-12 text-gray-400"><p>Complete Step 0 to generate knowledge bases</p></div>';
    }

    // Clear chat messages (keep initial welcome message)
    const chatMessages = document.getElementById('aiChatMessages');
    chatMessages.innerHTML = `
        <div class="ai-message bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
            <p class="text-sm text-gray-800">
                👋 Hi! I'm your Agent Foundry Assistant. I'll help you build a custom AI Foundry Agent.
                <br><br>
                <strong>Let's start:</strong> What kind of agent do you want to build? Describe what it should do.
            </p>
        </div>
    `;

    // Reset to step 0
    updateStepDisplay();

    // Add reset confirmation message to chat
    addChatMessage('assistant', '🔄 <strong>Wizard reset!</strong> Ready to build a new agent. Click a quick example or describe your agent to get started.');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========================================
// Drag and Drop Layout Customization
// ========================================

let draggedElement = null;

// Setup scroll navigation buttons
function setupScrollNavigation() {
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');

    // Show/hide scroll to top button based on scroll position
    window.addEventListener('scroll', function() {
        const scrollPosition = window.scrollY;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;

        // Show "scroll to top" button when scrolled down more than 300px
        if (scrollPosition > 300) {
            scrollToTopBtn.classList.remove('opacity-0', 'pointer-events-none');
            scrollToTopBtn.classList.add('opacity-100');
        } else {
            scrollToTopBtn.classList.remove('opacity-100');
            scrollToTopBtn.classList.add('opacity-0', 'pointer-events-none');
        }

        // Hide "scroll to bottom" button when at the bottom
        if (scrollPosition + windowHeight >= documentHeight - 100) {
            scrollToBottomBtn.classList.add('opacity-0', 'pointer-events-none');
        } else {
            scrollToBottomBtn.classList.remove('opacity-0', 'pointer-events-none');
        }
    });

    // Scroll to top
    scrollToTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Scroll to bottom
    scrollToBottomBtn.addEventListener('click', function() {
        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
        });
    });
}

function setupDragAndDrop() {
    const container = document.getElementById('draggableContainer');
    const draggableSections = document.querySelectorAll('.draggable-section');

    // Load saved layout
    loadSavedLayout();

    // Track if drag started from handle
    let isDragFromHandle = false;

    draggableSections.forEach(section => {
        // Make sections draggable
        section.setAttribute('draggable', 'true');

        // Track mousedown on drag handles (using event capturing to catch before button)
        const dragHandles = section.querySelectorAll('.drag-handle');
        dragHandles.forEach(handle => {
            // Add listener to the handle and its SVG children
            handle.addEventListener('mousedown', function(e) {
                e.stopPropagation(); // Prevent other handlers
                isDragFromHandle = true;
            }, true); // Use capture phase

            // Also handle clicks on SVG and its children
            const svg = handle.querySelector('svg');
            if (svg) {
                svg.addEventListener('mousedown', function(e) {
                    e.stopPropagation();
                    isDragFromHandle = true;
                }, true);
            }
        });

        // Drag start
        section.addEventListener('dragstart', function(e) {
            // Only allow drag if it started from a drag handle
            if (!isDragFromHandle) {
                e.preventDefault();
                return;
            }
            draggedElement = this;
            this.style.opacity = '0.5';
            this.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', this.innerHTML);
        });

        // Drag end
        section.addEventListener('dragend', function(e) {
            this.style.opacity = '';
            this.classList.remove('dragging');
            draggedElement = null;
            isDragFromHandle = false;

            // Save the new layout
            saveLayout();
        });

        // Drag over
        section.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            if (draggedElement !== this) {
                this.classList.add('drag-over');
            }
        });

        // Drag enter
        section.addEventListener('dragenter', function(e) {
            if (draggedElement !== this) {
                this.classList.add('drag-over');
            }
        });

        // Drag leave
        section.addEventListener('dragleave', function(e) {
            this.classList.remove('drag-over');
        });

        // Drop
        section.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');

            if (draggedElement !== this) {
                // Swap positions
                const allSections = Array.from(container.children);
                const draggedIndex = allSections.indexOf(draggedElement);
                const targetIndex = allSections.indexOf(this);

                if (draggedIndex < targetIndex) {
                    container.insertBefore(draggedElement, this.nextSibling);
                } else {
                    container.insertBefore(draggedElement, this);
                }

                // Visual feedback
                showToast('Layout updated! Your preference has been saved.', 'success');
            }
        });
    });
}

function saveLayout() {
    const container = document.getElementById('draggableContainer');
    const sections = Array.from(container.children);
    const layout = sections.map(section => section.dataset.section);

    localStorage.setItem('layoutOrder', JSON.stringify(layout));
}

function loadSavedLayout() {
    const savedLayout = localStorage.getItem('layoutOrder');
    if (!savedLayout) return;

    try {
        const layout = JSON.parse(savedLayout);
        const container = document.getElementById('draggableContainer');

        layout.forEach(sectionId => {
            const section = container.querySelector(`[data-section="${sectionId}"]`);
            if (section) {
                container.appendChild(section);
            }
        });
    } catch (e) {
        console.error('Failed to load saved layout:', e);
    }
}

function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 transition-all duration-300 ${
        type === 'success' ? 'bg-green-600' :
        type === 'error' ? 'bg-red-600' :
        'bg-indigo-600'
    }`;
    toast.innerHTML = message;

    document.body.appendChild(toast);

    // Fade in
    setTimeout(() => {
        toast.style.opacity = '1';
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// ============================================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================================

function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icon = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    }[type] || 'ℹ';

    const iconColor = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6',
        warning: '#f59e0b'
    }[type] || '#3b82f6';

    toast.innerHTML = `
        <div style="width: 20px; height: 20px; border-radius: 50%; background: ${iconColor}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">
            ${icon}
        </div>
        <div style="flex: 1;">
            <div style="font-weight: 600; color: #111827; margin-bottom: 2px;">${message.split('\n')[0]}</div>
            ${message.split('\n')[1] ? `<div style="font-size: 0.875rem; color: #6b7280;">${message.split('\n')[1]}</div>` : ''}
        </div>
        <button onclick="this.parentElement.classList.add('toast-hiding')" style="background: none; border: none; color: #9ca3af; cursor: pointer; padding: 0; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;">
            ✕
        </button>
    `;

    container.appendChild(toast);

    // Auto remove after duration
    setTimeout(() => {
        toast.classList.add('toast-hiding');
        setTimeout(() => {
            if (toast.parentElement) {
                container.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// ============================================================================
// AUTO-SAVE SYSTEM
// ============================================================================

let autoSaveTimeout = null;
const AUTO_SAVE_DELAY = 2000; // 2 seconds debounce
let isFirstAutoSave = true; // Track first auto-save for toast notification

function setupAutoSave() {
    // Track changes to all form fields
    const fieldsToWatch = [
        'agentDescription', 'agentTone', 'agentAudience',
        'projectName', 'projectDescription', 'agentName',
        'modelSelect', 'temperature', 'maxToolsIterations', 'systemPrompt'
    ];

    fieldsToWatch.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', triggerAutoSave);
            field.addEventListener('change', triggerAutoSave);
        }
    });
}

function triggerAutoSave() {
    // Clear existing timeout
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }

    // Show saving indicator
    showAutoSaveIndicator('Saving...');

    // Set new timeout
    autoSaveTimeout = setTimeout(() => {
        saveToLocalStorage();
        showAutoSaveIndicator('Saved');
        // Hide indicator after 2 seconds
        setTimeout(hideAutoSaveIndicator, 2000);
    }, AUTO_SAVE_DELAY);
}

function saveToLocalStorage() {
    const dataToSave = {
        agentConfig,
        knowledgeBases,
        additionalTools,
        outputs,
        promptVariables,
        currentStep,
        timestamp: Date.now()
    };

    try {
        localStorage.setItem('agentBuilderAutoSave', JSON.stringify(dataToSave));
        console.log('💾 Auto-saved to localStorage');

        // Show toast notification on first auto-save
        console.log('🔍 isFirstAutoSave:', isFirstAutoSave);
        if (isFirstAutoSave) {
            console.log('🎉 Showing first auto-save toast notification');
            showToast('Auto-save enabled! Your work is being saved automatically.', 'success');
            isFirstAutoSave = false;
        }
    } catch (error) {
        console.error('❌ Auto-save failed:', error);
        showToast('Auto-save failed\nPlease check your browser storage', 'error');
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('agentBuilderAutoSave');
        if (saved) {
            const data = JSON.parse(saved);
            const savedDate = new Date(data.timestamp);
            const now = new Date();
            const hoursSince = (now - savedDate) / (1000 * 60 * 60);

            // Only load if saved within last 24 hours
            if (hoursSince < 24) {
                const load = confirm(`Found auto-saved work from ${savedDate.toLocaleString()}.\n\nWould you like to restore it?`);
                if (load) {
                    agentConfig = data.agentConfig || agentConfig;
                    knowledgeBases = data.knowledgeBases || [];
                    additionalTools = data.additionalTools || [];
                    outputs = data.outputs || [];
                    promptVariables = data.promptVariables || [];
                    currentStep = data.currentStep || 0;

                    // Populate UI fields
                    populateFieldsFromConfig();
                    updateStepDisplay();
                    showToast('Auto-saved work restored successfully', 'success');

                    // Don't show first save toast since we loaded existing save
                    isFirstAutoSave = false;
                    return true;
                }
            } else {
                // Clear old auto-save
                localStorage.removeItem('agentBuilderAutoSave');
            }
        }
    } catch (error) {
        console.error('❌ Failed to load auto-save:', error);
    }
    return false;
}

function showAutoSaveIndicator(text) {
    const indicator = document.getElementById('autosaveIndicator');
    const textSpan = document.getElementById('autosaveText');
    if (indicator && textSpan) {
        textSpan.textContent = text;
        indicator.classList.add('visible');
    }
}

function hideAutoSaveIndicator() {
    const indicator = document.getElementById('autosaveIndicator');
    if (indicator) {
        indicator.classList.remove('visible');
    }
}

// ============================================================================
// PROGRESS BAR
// ============================================================================

function updateProgressBar() {
    const progressBar = document.getElementById('progressBar');
    if (!progressBar) return;

    // Calculate progress based on completed fields and current step
    let totalSteps = 8;
    let progress = 0;

    // Step-based progress (base 60%)
    progress += (currentStep / totalSteps) * 60;

    // Completion-based progress (additional 40%)
    let completionScore = 0;
    let totalPossible = 7;

    if (agentConfig.description) completionScore++;
    if (agentConfig.projectName) completionScore++;
    if (knowledgeBases.length > 0) completionScore++;
    if (agentConfig.systemPrompt) completionScore++;
    if (outputs.length > 0) completionScore++;
    if (agentConfig.agentName) completionScore++;
    if (agentConfig.model) completionScore++;

    progress += (completionScore / totalPossible) * 40;

    progressBar.style.width = `${Math.min(progress, 100)}%`;
}

// ============================================================================
// AGENT TEMPLATES
// ============================================================================
// Templates are loaded from agent-templates.js
// This allows for easier maintenance and community contributions

function showTemplatesModal() {
    const modal = document.getElementById('templatesModal');
    const grid = document.getElementById('templatesGrid');

    if (!modal || !grid) return;

    // Clear existing templates
    grid.innerHTML = '';

    // Populate templates
    const templates = window.agentTemplates || [];
    templates.forEach(template => {
        const card = document.createElement('div');
        card.className = 'template-card bg-white rounded-lg p-4 border-2 border-gray-200 hover:border-indigo-500 transition-all';
        card.innerHTML = `
            <div class="text-4xl mb-2">${template.icon}</div>
            <h4 class="font-bold text-gray-900 mb-1">${template.name}</h4>
            <p class="text-sm text-gray-600 mb-3">${template.description}</p>
            <button
                onclick="loadTemplate('${template.id}')"
                class="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 px-4 rounded transition-colors"
            >
                Load Template
            </button>
        `;
        grid.appendChild(card);
    });

    modal.classList.remove('hidden');
}

function hideTemplatesModal() {
    const modal = document.getElementById('templatesModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function loadTemplate(templateId) {
    const templates = window.agentTemplates || [];
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    // Confirm before loading
    if (agentConfig.projectName || knowledgeBases.length > 0) {
        const confirmed = confirm('Loading a template will replace your current work. Continue?');
        if (!confirmed) return;
    }

    // Load configuration
    Object.assign(agentConfig, template.config);

    // Load knowledge bases
    knowledgeBases = template.knowledgeBases.map((kb, index) => ({
        ...kb,
        id: index,
        customToolName: '',
        customToolDescription: ''
    }));
    kbCounter = knowledgeBases.length;

    // Load outputs from template
    if (template.outputs && template.outputs.length > 0) {
        outputs = template.outputs.map((output, index) => ({
            id: `output-${index + 1}`,
            outputName: sanitizeFunctionName(output.outputName || ''),
            functionName: sanitizeFunctionName(output.functionName || ''),
            functionDescription: output.functionDescription || '',
            outputType: output.outputType || 'custom',
            artifactType: output.artifactType || 'text',
            jsonSchema: output.jsonSchema || '',
            // Custom fields for editing
            customFunctionName: sanitizeFunctionName(output.functionName || ''),
            customFunctionDescription: output.functionDescription || '',
            customJsonSchema: output.jsonSchema || ''
        }));
        outputCounter = outputs.length;
        console.log(`✅ Loaded ${outputs.length} outputs from template`);
    } else {
        outputs = [];
        outputCounter = 0;
    }

    // Reset other fields
    additionalTools = [];
    promptVariables = [];

    // Populate UI
    populateFieldsFromConfig();
    renderKnowledgeBases();

    // Close modal
    hideTemplatesModal();

    // Show success message
    showToast(`Template loaded successfully\n${template.name} is ready to customize`, 'success');

    // Save to auto-save
    saveToLocalStorage();

    // Update progress
    updateProgressBar();
}

function populateFieldsFromConfig() {
    // Step 0/1 fields
    const projectName = document.getElementById('projectName');
    if (projectName) projectName.value = agentConfig.projectName || '';

    const projectDescription = document.getElementById('projectDescription');
    if (projectDescription) projectDescription.value = agentConfig.projectDescription || '';

    const agentName = document.getElementById('agentName');
    if (agentName) agentName.value = agentConfig.agentName || agentConfig.name || '';

    const agentDescription = document.getElementById('agentDescription');
    if (agentDescription) agentDescription.value = agentConfig.description || '';

    const agentTone = document.getElementById('agentTone');
    if (agentTone) agentTone.value = agentConfig.tone || 'professional';

    const agentAudience = document.getElementById('agentAudience');
    if (agentAudience) agentAudience.value = agentConfig.audience || '';

    // Step 3 fields
    const modelSelect = document.getElementById('modelSelect');
    if (modelSelect) modelSelect.value = agentConfig.model || 'anthropic.claude-4.5-sonnet';

    const temperature = document.getElementById('temperature');
    const temperatureInput = document.getElementById('temperatureInput');
    if (temperature && temperatureInput) {
        temperature.value = agentConfig.temperature || 0.5;
        temperatureInput.value = agentConfig.temperature || 0.5;
    }

    const systemPrompt = document.getElementById('systemPrompt');
    if (systemPrompt) {
        systemPrompt.value = agentConfig.systemPrompt || '';
        updateSystemPromptCharCount();
    }
}

// ============================================================================
// COLLABORATION (IMPORT/EXPORT)
// ============================================================================

function exportAgentConfig() {
    // Validate that there's meaningful content to export
    const hasProjectName = agentConfig.projectName && agentConfig.projectName.trim() !== '';
    const hasAgentName = agentConfig.agentName && agentConfig.agentName.trim() !== '';
    const hasSystemPrompt = agentConfig.systemPrompt && agentConfig.systemPrompt.trim() !== '';
    const hasKnowledgeBases = knowledgeBases && knowledgeBases.length > 0;

    // Check if any meaningful data exists
    if (!hasProjectName && !hasAgentName && !hasSystemPrompt && !hasKnowledgeBases) {
        const shouldProceed = confirm(
            '⚠️ No Configuration Data Found\n\n' +
            'Your agent configuration appears to be empty. ' +
            'The export will contain default values only.\n\n' +
            'Recommended: Complete at least the following before exporting:\n' +
            '• Project Name\n' +
            '• Agent Name\n' +
            '• System Prompt\n' +
            '• Knowledge Bases\n\n' +
            'Do you want to export anyway?'
        );

        if (!shouldProceed) {
            return; // Cancel export
        }
    }

    const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        agentConfig,
        knowledgeBases,
        additionalTools,
        outputs,
        promptVariables
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${(agentConfig.agentName || 'agent').replace(/\s+/g, '_')}_config_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Configuration exported successfully\nShare this file with your team', 'success');
}

function importAgentConfig() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importData = JSON.parse(event.target.result);

                // Validate structure
                if (!importData.version || !importData.agentConfig) {
                    throw new Error('Invalid configuration file format');
                }

                // Confirm before importing
                const confirmed = confirm(`Import configuration from ${new Date(importData.exportDate).toLocaleString()}?\n\nThis will replace your current work.`);
                if (!confirmed) return;

                // Load data
                agentConfig = importData.agentConfig;
                knowledgeBases = importData.knowledgeBases || [];
                additionalTools = importData.additionalTools || [];
                outputs = importData.outputs || [];
                promptVariables = importData.promptVariables || [];

                // Update counters
                kbCounter = knowledgeBases.length;
                toolCounter = additionalTools.length;
                outputCounter = outputs.length;
                variableCounter = promptVariables.length;

                // Populate UI
                populateFieldsFromConfig();
                renderKnowledgeBases();
                renderTools();
                renderOutputs();
                renderPromptVariables();

                showToast('Configuration imported successfully\nAll data has been loaded', 'success');

                // Save to auto-save
                saveToLocalStorage();

                // Update progress
                updateProgressBar();

            } catch (error) {
                console.error('Import error:', error);
                showToast('Failed to import configuration\nPlease check the file format', 'error');
            }
        };

        reader.readAsText(file);
    };

    input.click();
}

// ============================================================================
// MARKDOWN PREVIEW
// ============================================================================

function toggleSystemPromptPreview() {
    const textarea = document.getElementById('systemPrompt');
    const preview = document.getElementById('systemPromptPreview');
    const button = document.getElementById('toggleSystemPromptPreview');

    if (!textarea || !preview || !button) return;

    if (preview.classList.contains('hidden')) {
        // Show preview
        const markdown = textarea.value;
        const html = marked.parse(markdown);
        preview.innerHTML = html;
        preview.classList.remove('hidden');
        textarea.classList.add('hidden');
        button.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            Edit
        `;
    } else {
        // Show editor
        preview.classList.add('hidden');
        textarea.classList.remove('hidden');
        button.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
            Preview
        `;
    }
}

// ============================================================================
// DESCRIPTION MODAL FUNCTIONS
// ============================================================================

function toggleDescriptionModal() {
    const modal = document.getElementById('descriptionModal');
    const mainDescription = document.getElementById('agentDescription');
    const modalDescription = document.getElementById('modalDescription');

    if (modal.classList.contains('hidden')) {
        // Opening modal - copy content from main textarea to modal
        modalDescription.value = mainDescription.value;
        modal.classList.remove('hidden');
        // Focus the modal textarea
        setTimeout(() => modalDescription.focus(), 100);
    } else {
        // Closing modal
        modal.classList.add('hidden');
    }
}

function saveDescriptionFromModal() {
    const mainDescription = document.getElementById('agentDescription');
    const modalDescription = document.getElementById('modalDescription');

    // Copy content from modal to main textarea
    mainDescription.value = modalDescription.value;

    // Update agentConfig
    agentConfig.description = modalDescription.value;

    // Close modal
    toggleDescriptionModal();

    // Trigger auto-save
    saveToLocalStorage();
}

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const descModal = document.getElementById('descriptionModal');
        const chatModal = document.getElementById('chatInputModal');

        if (descModal && !descModal.classList.contains('hidden')) {
            toggleDescriptionModal();
        } else if (chatModal && !chatModal.classList.contains('hidden')) {
            toggleChatInputModal();
        }
    }
});

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const descModal = document.getElementById('descriptionModal');
    const chatModal = document.getElementById('chatInputModal');

    if (descModal && e.target === descModal) {
        toggleDescriptionModal();
    } else if (chatModal && e.target === chatModal) {
        toggleChatInputModal();
    }
});

// ============================================================================
// CHAT INPUT MODAL FUNCTIONS
// ============================================================================

function toggleChatInputModal() {
    const modal = document.getElementById('chatInputModal');
    const mainChatInput = document.getElementById('aiChatInput');
    const modalChatInput = document.getElementById('modalChatInput');

    if (modal.classList.contains('hidden')) {
        // Opening modal - copy content from main textarea to modal
        modalChatInput.value = mainChatInput.value;
        modal.classList.remove('hidden');
        // Focus the modal textarea
        setTimeout(() => modalChatInput.focus(), 100);
    } else {
        // Closing modal
        modal.classList.add('hidden');
    }
}

function saveChatInputFromModal() {
    const mainChatInput = document.getElementById('aiChatInput');
    const modalChatInput = document.getElementById('modalChatInput');

    // Copy content from modal to main textarea
    mainChatInput.value = modalChatInput.value;

    // Close modal
    toggleChatInputModal();
}

// ============================================================================
// OPTIMIZE AGENT FUNCTIONS
// ============================================================================

// Store optimization suggestions for selective application
window.optimizationSuggestions = [];
window.originalAgentBeforeOptimize = {};

async function optimizeAgent() {
    const modal = document.getElementById('optimizeModal');
    const loadingDiv = document.getElementById('optimizeLoading');
    const resultsDiv = document.getElementById('optimizationResults');

    // Store original agent state for comparison
    window.originalAgentBeforeOptimize = {
        systemPrompt: agentConfig.systemPrompt,
        temperature: agentConfig.temperature,
        maxToolsIterations: agentConfig.maxToolsIterations,
        model: agentConfig.model,
        knowledgeBasesCount: knowledgeBases.length,
        outputsCount: outputs.length
    };

    // Show modal and loading state
    modal.classList.remove('hidden');
    loadingDiv.style.display = 'block';
    resultsDiv.innerHTML = loadingDiv.outerHTML;

    try {
        // Reset chat session for fresh context
        if (typeof tdLlmAPI !== 'undefined') {
            tdLlmAPI.resetChatSession();
        }

        // Build analysis prompt with structured JSON output
        const analysisPrompt = `You are an AI agent optimization expert. Analyze this agent configuration and provide actionable recommendations.

**Agent Configuration:**
- Name: ${agentConfig.name}
- Domain: ${agentConfig.domain}
- Model: ${agentConfig.model}
- Temperature: ${agentConfig.temperature}
- Max Tools Iterations: ${agentConfig.maxToolsIterations}
- Number of Knowledge Bases: ${knowledgeBases.length}
- Number of Outputs: ${outputs.length}
- System Prompt Length: ${agentConfig.systemPrompt?.length || 0} characters

**System Prompt Preview:**
${agentConfig.systemPrompt?.substring(0, 500)}...

**Knowledge Bases:**
${knowledgeBases.map((kb, i) => `${i + 1}. ${kb.name} (${kb.content?.length || 0} chars)`).join('\n') || 'None'}

**Outputs:**
${outputs.map((out, i) => `${i + 1}. ${out.functionName} (${out.outputType})`).join('\n') || 'None'}

**IMPORTANT: Return your response in this EXACT JSON format:**

\`\`\`json
{
  "overallScore": 75,
  "strengths": [
    "Clear domain focus",
    "Good model selection for the use case"
  ],
  "suggestions": [
    {
      "id": 1,
      "category": "knowledge_bases",
      "priority": "high",
      "title": "Add Performance Metrics KB",
      "description": "The agent lacks reference data for industry benchmarks",
      "currentState": "No performance metrics knowledge base",
      "recommendedAction": "Add a knowledge base covering KPIs, benchmarks, and metrics",
      "impact": "Enables data-driven recommendations"
    },
    {
      "id": 2,
      "category": "outputs",
      "priority": "medium",
      "title": "Add Visualization Output",
      "description": "Agent would benefit from chart generation capability",
      "currentState": "Only text-based outputs",
      "recommendedAction": "Add Plotly visualization output for metrics",
      "impact": "Improves user engagement with visual data"
    }
  ],
  "addKnowledgeBases": [
    {"name": "Performance Metrics", "content": "Detailed content about metrics and benchmarks..."}
  ],
  "addOutputs": [
    {
      "outputName": "Performance Chart",
      "functionName": "generate_performance_chart",
      "functionDescription": "Generate performance visualization",
      "outputType": "visualization",
      "artifactType": "json",
      "jsonSchema": "{\\"type\\": \\"object\\", \\"properties\\": {\\"data\\": {\\"type\\": \\"array\\"}}}"
    }
  ],
  "enhanceSystemPrompt": "Additional text to improve the system prompt...",
  "adjustParameters": {
    "temperature": 0.5,
    "maxToolsIterations": 5
  }
}
\`\`\`

**Categories:** system_prompt, model, parameters, knowledge_bases, outputs, overall
**Priorities:** high, medium, low

Provide 3-6 specific suggestions with clear actionable recommendations.`;

        // Call TD LLM API
        const response = await claudeAPI.sendMessage(analysisPrompt, []);

        // Parse JSON from response
        let analysisData = null;
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/(\{[\s\S]*\})/);

        if (jsonMatch) {
            try {
                analysisData = JSON.parse(jsonMatch[1]);
            } catch (e) {
                console.warn('Failed to parse optimization JSON:', e);
            }
        }

        if (!analysisData) {
            throw new Error('Could not parse AI optimization response');
        }

        // Store suggestions globally
        window.optimizationSuggestions = analysisData.suggestions || [];
        window.currentOptimizationRecommendations = {
            addKnowledgeBases: analysisData.addKnowledgeBases || [],
            addOutputs: analysisData.addOutputs || [],
            enhanceSystemPrompt: analysisData.enhanceSystemPrompt || '',
            adjustParameters: analysisData.adjustParameters || null
        };
        window.currentOptimizationScore = analysisData.overallScore;

        // Build the user-friendly UI
        const optimizationHTML = buildOptimizationUI(analysisData);
        resultsDiv.innerHTML = optimizationHTML;

        // Cache for "Back" navigation
        window.cachedOptimizationHTML = optimizationHTML;

    } catch (error) {
        resultsDiv.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                <p class="text-red-900"><strong>Error:</strong> ${error.message}</p>
                <button onclick="optimizeAgent()" class="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg">
                    Retry
                </button>
            </div>
        `;
    }
}

function buildOptimizationUI(data) {
    const { overallScore, strengths, suggestions } = data;

    // Score color
    const scoreColor = overallScore >= 80 ? 'text-green-600' : overallScore >= 60 ? 'text-amber-600' : 'text-red-600';
    const scoreBg = overallScore >= 80 ? 'bg-green-100' : overallScore >= 60 ? 'bg-amber-100' : 'bg-red-100';

    // Category icons
    const categoryIcons = {
        system_prompt: '📝',
        model: '🤖',
        parameters: '⚙️',
        knowledge_bases: '📚',
        outputs: '📊',
        overall: '🎯'
    };

    // Priority badges
    const priorityBadges = {
        high: '<span class="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">High Priority</span>',
        medium: '<span class="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Medium</span>',
        low: '<span class="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">Low</span>'
    };

    // Build strengths section
    const strengthsHTML = strengths && strengths.length > 0 ? `
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h4 class="font-semibold text-green-800 mb-2 flex items-center gap-2">
                <span>✅</span> What's Working Well
            </h4>
            <ul class="text-sm text-green-700 space-y-1">
                ${strengths.map(s => `<li class="flex items-start gap-2"><span class="text-green-500">•</span> ${s}</li>`).join('')}
            </ul>
        </div>
    ` : '';

    // Build suggestions section
    const suggestionsHTML = suggestions && suggestions.length > 0 ? suggestions.map((s, idx) => `
        <div class="bg-white border border-gray-200 rounded-lg p-4 mb-3 optimization-card" data-optimization-id="${s.id || idx}">
            <div class="flex items-start justify-between gap-4 mb-3">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-lg">${categoryIcons[s.category] || '💡'}</span>
                        <h5 class="font-semibold text-gray-900">${s.title}</h5>
                        ${priorityBadges[s.priority] || ''}
                    </div>
                    <p class="text-sm text-gray-600">${s.description}</p>
                </div>
                <button
                    onclick="applySingleOptimization(${s.id || idx})"
                    class="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-1"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    Apply
                </button>
            </div>

            ${s.currentState || s.recommendedAction ? `
                <div class="bg-gray-50 rounded-lg p-3 text-xs">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        ${s.currentState ? `
                            <div>
                                <div class="font-medium text-gray-500 mb-1 flex items-center gap-1">
                                    <span class="text-amber-500">○</span> Current State
                                </div>
                                <div class="bg-amber-50 border border-amber-200 rounded p-2 text-gray-700">${s.currentState}</div>
                            </div>
                        ` : '<div></div>'}
                        ${s.recommendedAction ? `
                            <div>
                                <div class="font-medium text-gray-500 mb-1 flex items-center gap-1">
                                    <span class="text-green-500">→</span> Recommended
                                </div>
                                <div class="bg-green-50 border border-green-200 rounded p-2 text-gray-700">${s.recommendedAction}</div>
                            </div>
                        ` : '<div></div>'}
                    </div>
                    ${s.impact ? `<p class="text-gray-500 mt-2 italic">Impact: ${s.impact}</p>` : ''}
                </div>
            ` : ''}
        </div>
    `).join('') : '<p class="text-gray-500 text-center py-4">No specific suggestions - your agent looks well-configured!</p>';

    // Count available quick actions
    const recs = window.currentOptimizationRecommendations || {};
    const hasKBs = recs.addKnowledgeBases && recs.addKnowledgeBases.length > 0;
    const hasOutputs = recs.addOutputs && recs.addOutputs.length > 0;
    const hasPromptEnhancement = recs.enhanceSystemPrompt && recs.enhanceSystemPrompt.length > 0;
    const hasParams = recs.adjustParameters && (recs.adjustParameters.temperature !== undefined || recs.adjustParameters.maxToolsIterations !== undefined);

    return `
        <!-- Score Header -->
        <div class="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div class="flex items-center gap-4">
                <div class="${scoreBg} rounded-full w-16 h-16 flex items-center justify-center">
                    <span class="${scoreColor} text-2xl font-bold">${overallScore || '--'}</span>
                </div>
                <div>
                    <h3 class="font-semibold text-gray-900">Agent Quality Score</h3>
                    <p class="text-sm text-gray-500">${suggestions?.length || 0} optimization opportunities found</p>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="showOptimizationSummary()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    Summary
                </button>
            </div>
        </div>

        <!-- Strengths -->
        ${strengthsHTML}

        <!-- Suggestions Header -->
        <div class="flex items-center justify-between mb-3">
            <h4 class="font-semibold text-gray-900 flex items-center gap-2">
                <span>🚀</span> Optimization Opportunities
            </h4>
            ${suggestions && suggestions.length > 0 ? `
                <button onclick="applyAllOptimizations()" class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-all text-sm flex items-center gap-2 shadow-md">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                    Apply All Optimizations
                </button>
            ` : ''}
        </div>

        <!-- Suggestion Cards -->
        <div class="max-h-72 overflow-y-auto pr-2 mb-4">
            ${suggestionsHTML}
        </div>

        <!-- Quick Actions Section -->
        ${(hasKBs || hasOutputs || hasPromptEnhancement || hasParams) ? `
            <div class="border-t border-gray-200 pt-4 mt-4">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span>⚡</span> Quick Actions
                </h4>
                <div class="grid grid-cols-2 gap-2">
                    ${hasKBs ? `
                        <button onclick="applyKnowledgeBaseRecommendations()" class="bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-3 rounded-lg transition-colors text-sm flex items-center gap-2 border border-blue-200">
                            <span>📚</span>
                            Add ${recs.addKnowledgeBases.length} KB${recs.addKnowledgeBases.length > 1 ? 's' : ''}
                        </button>
                    ` : ''}
                    ${hasOutputs ? `
                        <button onclick="applyOutputRecommendations()" class="bg-green-50 hover:bg-green-100 text-green-700 font-medium py-2 px-3 rounded-lg transition-colors text-sm flex items-center gap-2 border border-green-200">
                            <span>📊</span>
                            Add ${recs.addOutputs.length} Output${recs.addOutputs.length > 1 ? 's' : ''}
                        </button>
                    ` : ''}
                    ${hasPromptEnhancement ? `
                        <button onclick="applySystemPromptEnhancement()" class="bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium py-2 px-3 rounded-lg transition-colors text-sm flex items-center gap-2 border border-purple-200">
                            <span>📝</span>
                            Enhance Prompt
                        </button>
                    ` : ''}
                    ${hasParams ? `
                        <button onclick="applyParameterAdjustments()" class="bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium py-2 px-3 rounded-lg transition-colors text-sm flex items-center gap-2 border border-amber-200">
                            <span>⚙️</span>
                            Adjust Parameters
                        </button>
                    ` : ''}
                </div>
            </div>
        ` : ''}

        <!-- Footer Actions -->
        <div class="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
            <button onclick="closeOptimizeModal()" class="text-gray-600 hover:text-gray-800 font-medium py-2 px-4 transition-colors">
                Close
            </button>
        </div>
    `;
}

function applySingleOptimization(suggestionId) {
    const suggestion = window.optimizationSuggestions.find(s => (s.id || window.optimizationSuggestions.indexOf(s)) === suggestionId);
    if (!suggestion) return;

    const recs = window.currentOptimizationRecommendations || {};

    // Apply based on category
    switch (suggestion.category) {
        case 'knowledge_bases':
            if (recs.addKnowledgeBases && recs.addKnowledgeBases.length > 0) {
                applyKnowledgeBaseRecommendations();
            }
            break;
        case 'outputs':
            if (recs.addOutputs && recs.addOutputs.length > 0) {
                applyOutputRecommendations();
            }
            break;
        case 'system_prompt':
            if (recs.enhanceSystemPrompt) {
                applySystemPromptEnhancement();
            }
            break;
        case 'parameters':
        case 'model':
            if (recs.adjustParameters) {
                applyParameterAdjustments();
            }
            break;
        default:
            showToast(`Applied: ${suggestion.title}`, 'success');
    }

    // Mark as applied
    const card = document.querySelector(`[data-optimization-id="${suggestionId}"]`);
    if (card) {
        card.classList.add('opacity-50');
        const btn = card.querySelector('button');
        if (btn) {
            btn.innerHTML = '<span class="text-green-500">✓ Applied</span>';
            btn.disabled = true;
            btn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
            btn.classList.add('bg-gray-200', 'cursor-not-allowed');
        }
    }
}

function applyAllOptimizations() {
    const recs = window.currentOptimizationRecommendations;
    if (!recs) return;

    let appliedCount = 0;

    if (recs.addKnowledgeBases && recs.addKnowledgeBases.length > 0) {
        applyKnowledgeBaseRecommendations();
        appliedCount++;
    }
    if (recs.addOutputs && recs.addOutputs.length > 0) {
        applyOutputRecommendations();
        appliedCount++;
    }
    if (recs.enhanceSystemPrompt) {
        applySystemPromptEnhancement();
        appliedCount++;
    }
    if (recs.adjustParameters) {
        applyParameterAdjustments();
        appliedCount++;
    }

    if (appliedCount > 0) {
        closeOptimizeModal();
        showToast(`✅ Applied ${appliedCount} optimization${appliedCount > 1 ? 's' : ''}!`, 'success');
    } else {
        showToast('No optimizations to apply', 'info');
    }
}

function showOptimizationSummary() {
    const resultsDiv = document.getElementById('optimizationResults');
    const recs = window.currentOptimizationRecommendations || {};
    const score = window.currentOptimizationScore || '--';
    const original = window.originalAgentBeforeOptimize || {};

    resultsDiv.innerHTML = `
        <div class="mb-4">
            <button onclick="backToOptimizations()" class="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
                Back to Optimizations
            </button>
        </div>

        <h4 class="font-semibold text-gray-900 mb-4">Optimization Summary</h4>

        <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="bg-gray-50 rounded-lg p-4">
                <h5 class="font-medium text-gray-700 mb-2">Current State</h5>
                <ul class="text-sm text-gray-600 space-y-1">
                    <li>Score: <span class="font-medium">${score}/100</span></li>
                    <li>Knowledge Bases: ${original.knowledgeBasesCount || 0}</li>
                    <li>Outputs: ${original.outputsCount || 0}</li>
                    <li>Temperature: ${original.temperature}</li>
                    <li>Max Iterations: ${original.maxToolsIterations}</li>
                </ul>
            </div>
            <div class="bg-indigo-50 rounded-lg p-4">
                <h5 class="font-medium text-indigo-700 mb-2">After Optimizations</h5>
                <ul class="text-sm text-indigo-600 space-y-1">
                    <li>Knowledge Bases: ${(original.knowledgeBasesCount || 0) + (recs.addKnowledgeBases?.length || 0)}</li>
                    <li>Outputs: ${(original.outputsCount || 0) + (recs.addOutputs?.length || 0)}</li>
                    <li>Temperature: ${recs.adjustParameters?.temperature ?? original.temperature}</li>
                    <li>Max Iterations: ${recs.adjustParameters?.maxToolsIterations ?? original.maxToolsIterations}</li>
                    ${recs.enhanceSystemPrompt ? '<li class="text-green-600">+ Enhanced Prompt</li>' : ''}
                </ul>
            </div>
        </div>

        <div class="flex justify-end gap-3">
            <button onclick="backToOptimizations()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors">
                Back
            </button>
            <button onclick="applyAllOptimizations()" class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition-all shadow-md flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                Apply All
            </button>
        </div>
    `;
}

function backToOptimizations() {
    if (window.cachedOptimizationHTML) {
        const resultsDiv = document.getElementById('optimizationResults');
        if (resultsDiv) {
            resultsDiv.innerHTML = window.cachedOptimizationHTML;
        }
    } else {
        optimizeAgent();
    }
}

function closeOptimizeModal() {
    document.getElementById('optimizeModal').classList.add('hidden');
}

// ============================================================================
// REFINE SYSTEM PROMPT WITH AI
// ============================================================================

// Store individual suggestions for selective application
window.refinementSuggestions = [];
window.originalPromptBeforeRefine = '';

async function refineSystemPrompt() {
    const modal = document.getElementById('refinePromptModal');
    const loadingDiv = document.getElementById('refinePromptLoading');
    const resultsDiv = document.getElementById('refinePromptResults');

    const currentPrompt = agentConfig.systemPrompt;
    if (!currentPrompt || currentPrompt.trim().length === 0) {
        showToast('Please generate or write a system prompt first', 'warning');
        return;
    }

    // Store original prompt for comparison
    window.originalPromptBeforeRefine = currentPrompt;

    // Show modal and loading state
    modal.classList.remove('hidden');
    loadingDiv.style.display = 'block';
    resultsDiv.innerHTML = loadingDiv.outerHTML;

    try {
        // Reset chat session for fresh context (important after regeneration)
        if (typeof tdLlmAPI !== 'undefined') {
            tdLlmAPI.resetChatSession();
        }

        const refinementPrompt = `You are an expert at writing effective AI agent system prompts. Analyze this system prompt and provide specific, actionable suggestions.

**Current System Prompt:**
${currentPrompt}

**Agent Context:**
- Name: ${agentConfig.name || 'AI Assistant'}
- Domain: ${agentConfig.domain || 'general'}
- Character Count: ${currentPrompt.length} / 9000

**Your Task:**
Provide a structured analysis with SPECIFIC, ACTIONABLE suggestions. Each suggestion should include the EXACT text to add, modify, or remove.

**IMPORTANT: Return your response in this EXACT JSON format:**

\`\`\`json
{
  "overallScore": 85,
  "strengths": [
    "Clear role definition",
    "Good structure with sections"
  ],
  "suggestions": [
    {
      "id": 1,
      "category": "clarity",
      "priority": "high",
      "title": "Add specific expertise areas",
      "description": "The prompt should list specific skills and knowledge areas",
      "currentText": "You are an expert assistant",
      "suggestedText": "You are an expert marketing strategist with deep knowledge in:\\n- Digital advertising (Meta, Google, TikTok)\\n- Campaign optimization and A/B testing\\n- Budget allocation and ROI analysis",
      "impact": "Makes the agent's expertise more specific and actionable"
    },
    {
      "id": 2,
      "category": "structure",
      "priority": "medium",
      "title": "Add response format guidelines",
      "description": "Include how the agent should structure responses",
      "currentText": "",
      "suggestedText": "\\n\\n## Response Format\\nWhen providing recommendations:\\n1. Start with a brief summary\\n2. List specific action items\\n3. Include relevant metrics or benchmarks",
      "impact": "Ensures consistent, well-structured responses"
    }
  ],
  "refinedPrompt": "The complete improved version of the system prompt here..."
}
\`\`\`

**Categories:** clarity, structure, specificity, completeness, conciseness, tone
**Priorities:** high, medium, low

Provide 3-6 specific suggestions. Each suggestion MUST have currentText (can be empty for additions) and suggestedText.`;

        const response = await claudeAPI.sendMessage(refinementPrompt, []);

        // Parse the JSON response
        let analysisData;
        try {
            const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/(\{[\s\S]*\})/);
            if (jsonMatch) {
                analysisData = JSON.parse(jsonMatch[1]);
            } else {
                throw new Error('Could not parse AI response');
            }
        } catch (parseError) {
            console.error('Parse error:', parseError);
            // Fallback to simple display
            resultsDiv.innerHTML = `
                <div class="prose max-w-none">
                    ${response}
                </div>
                <div class="mt-4 flex justify-end">
                    <button onclick="closeRefinePromptModal()" class="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg">Close</button>
                </div>
            `;
            return;
        }

        // Store suggestions globally
        window.refinementSuggestions = analysisData.suggestions || [];
        window.currentRefinedPrompt = analysisData.refinedPrompt || '';

        // Build the user-friendly UI
        const suggestionsHTML = buildRefinementUI(analysisData);
        resultsDiv.innerHTML = suggestionsHTML;

        // Cache the suggestions HTML for "Back" navigation
        window.cachedSuggestionsHTML = suggestionsHTML;

    } catch (error) {
        resultsDiv.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                <p class="text-red-900"><strong>Error:</strong> ${error.message}</p>
                <button onclick="refineSystemPrompt()" class="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg">
                    Retry
                </button>
            </div>
        `;
    }
}

function buildRefinementUI(data) {
    const { overallScore, strengths, suggestions } = data;

    // Score color
    const scoreColor = overallScore >= 80 ? 'text-green-600' : overallScore >= 60 ? 'text-amber-600' : 'text-red-600';
    const scoreBg = overallScore >= 80 ? 'bg-green-100' : overallScore >= 60 ? 'bg-amber-100' : 'bg-red-100';

    // Category icons
    const categoryIcons = {
        clarity: '🎯',
        structure: '📋',
        specificity: '🔍',
        completeness: '✅',
        conciseness: '✂️',
        tone: '💬'
    };

    // Priority badges
    const priorityBadges = {
        high: '<span class="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">High Priority</span>',
        medium: '<span class="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Medium</span>',
        low: '<span class="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">Low</span>'
    };

    // Build strengths section
    const strengthsHTML = strengths && strengths.length > 0 ? `
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h4 class="font-semibold text-green-800 mb-2 flex items-center gap-2">
                <span>✅</span> What's Working Well
            </h4>
            <ul class="text-sm text-green-700 space-y-1">
                ${strengths.map(s => `<li class="flex items-start gap-2"><span class="text-green-500">•</span> ${s}</li>`).join('')}
            </ul>
        </div>
    ` : '';

    // Build suggestions section
    const suggestionsHTML = suggestions && suggestions.length > 0 ? suggestions.map((s, idx) => `
        <div class="bg-white border border-gray-200 rounded-lg p-4 mb-3 suggestion-card" data-suggestion-id="${s.id || idx}">
            <div class="flex items-start justify-between gap-4 mb-3">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-lg">${categoryIcons[s.category] || '💡'}</span>
                        <h5 class="font-semibold text-gray-900">${s.title}</h5>
                        ${priorityBadges[s.priority] || ''}
                    </div>
                    <p class="text-sm text-gray-600">${s.description}</p>
                </div>
                <button
                    onclick="applySingleSuggestion(${s.id || idx})"
                    class="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-1"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    Apply
                </button>
            </div>

            ${s.currentText || s.suggestedText ? `
                <div class="bg-gray-50 rounded-lg p-3 text-xs">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        ${s.currentText ? `
                            <div>
                                <div class="font-medium text-gray-500 mb-1 flex items-center gap-1">
                                    <span class="text-red-500">−</span> Current
                                </div>
                                <div class="bg-red-50 border border-red-200 rounded p-2 text-gray-700 font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">${escapeHtml(s.currentText.substring(0, 200))}${s.currentText.length > 200 ? '...' : ''}</div>
                            </div>
                        ` : '<div></div>'}
                        <div>
                            <div class="font-medium text-gray-500 mb-1 flex items-center gap-1">
                                <span class="text-green-500">+</span> Suggested
                            </div>
                            <div class="bg-green-50 border border-green-200 rounded p-2 text-gray-700 font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">${escapeHtml((s.suggestedText || '').substring(0, 200))}${(s.suggestedText || '').length > 200 ? '...' : ''}</div>
                        </div>
                    </div>
                    ${s.impact ? `<p class="text-gray-500 mt-2 italic">Impact: ${s.impact}</p>` : ''}
                </div>
            ` : ''}
        </div>
    `).join('') : '<p class="text-gray-500 text-center py-4">No specific suggestions - your prompt looks good!</p>';

    return `
        <!-- Score Header -->
        <div class="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div class="flex items-center gap-4">
                <div class="${scoreBg} rounded-full w-16 h-16 flex items-center justify-center">
                    <span class="${scoreColor} text-2xl font-bold">${overallScore || '--'}</span>
                </div>
                <div>
                    <h3 class="font-semibold text-gray-900">Prompt Quality Score</h3>
                    <p class="text-sm text-gray-500">${suggestions?.length || 0} suggestions found</p>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="showComparisonView()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    Compare
                </button>
            </div>
        </div>

        <!-- Strengths -->
        ${strengthsHTML}

        <!-- Suggestions Header -->
        <div class="flex items-center justify-between mb-3">
            <h4 class="font-semibold text-gray-900 flex items-center gap-2">
                <span>💡</span> Improvement Suggestions
            </h4>
            ${suggestions && suggestions.length > 0 ? `
                <button onclick="applyAllSuggestions()" class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-all text-sm flex items-center gap-2 shadow-md">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Accept All Suggestions
                </button>
            ` : ''}
        </div>

        <!-- Suggestion Cards -->
        <div class="max-h-80 overflow-y-auto pr-2">
            ${suggestionsHTML}
        </div>

        <!-- Footer Actions -->
        <div class="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
            <button onclick="closeRefinePromptModal()" class="text-gray-600 hover:text-gray-800 font-medium py-2 px-4 transition-colors">
                Cancel
            </button>
            <div class="flex gap-3">
                ${window.currentRefinedPrompt ? `
                    <button onclick="previewRefinedPrompt()" class="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                        Preview Full Revision
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function applySingleSuggestion(suggestionId) {
    const suggestion = window.refinementSuggestions.find(s => (s.id || window.refinementSuggestions.indexOf(s)) === suggestionId);
    if (!suggestion) return;

    let currentPrompt = agentConfig.systemPrompt;

    if (suggestion.currentText && suggestion.currentText.trim()) {
        // Replace existing text
        if (currentPrompt.includes(suggestion.currentText)) {
            currentPrompt = currentPrompt.replace(suggestion.currentText, suggestion.suggestedText);
        } else {
            // If exact match not found, append the suggestion
            currentPrompt += '\n\n' + suggestion.suggestedText;
        }
    } else {
        // Add new text
        currentPrompt += '\n\n' + suggestion.suggestedText;
    }

    // Apply and truncate if needed
    agentConfig.systemPrompt = truncateSystemPrompt(currentPrompt);
    document.getElementById('systemPrompt').value = agentConfig.systemPrompt;
    updateSystemPromptCharCount();

    // Mark suggestion as applied
    const card = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);
    if (card) {
        card.classList.add('opacity-50');
        card.querySelector('button').innerHTML = '<span class="text-green-500">✓ Applied</span>';
        card.querySelector('button').disabled = true;
        card.querySelector('button').classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
        card.querySelector('button').classList.add('bg-gray-200', 'cursor-not-allowed');
    }

    showToast(`Applied: ${suggestion.title}`, 'success');
}

function applyAllSuggestions() {
    if (window.currentRefinedPrompt) {
        // Apply the complete refined version
        agentConfig.systemPrompt = truncateSystemPrompt(window.currentRefinedPrompt);
        document.getElementById('systemPrompt').value = agentConfig.systemPrompt;
        updateSystemPromptCharCount();
        closeRefinePromptModal();
        showToast('All suggestions applied!', 'success');
    } else {
        // Apply suggestions one by one
        window.refinementSuggestions.forEach((s, idx) => {
            applySingleSuggestion(s.id || idx);
        });
        setTimeout(() => {
            closeRefinePromptModal();
            showToast('All suggestions applied!', 'success');
        }, 500);
    }
}

function showComparisonView() {
    const resultsDiv = document.getElementById('refinePromptResults');
    const original = window.originalPromptBeforeRefine || '';
    const refined = window.currentRefinedPrompt || agentConfig.systemPrompt;

    resultsDiv.innerHTML = `
        <div class="mb-4">
            <button onclick="backToSuggestions()" class="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
                Back to Suggestions
            </button>
        </div>

        <h4 class="font-semibold text-gray-900 mb-4">Side-by-Side Comparison</h4>

        <div class="grid grid-cols-2 gap-4">
            <div>
                <div class="flex items-center gap-2 mb-2">
                    <span class="text-red-500 font-bold">−</span>
                    <span class="font-medium text-gray-700">Original (${original.length} chars)</span>
                </div>
                <div class="bg-red-50 border border-red-200 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
                    ${escapeHtml(original)}
                </div>
            </div>
            <div>
                <div class="flex items-center gap-2 mb-2">
                    <span class="text-green-500 font-bold">+</span>
                    <span class="font-medium text-gray-700">Refined (${refined.length} chars)</span>
                </div>
                <div class="bg-green-50 border border-green-200 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
                    ${escapeHtml(refined)}
                </div>
            </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
            <button onclick="backToSuggestions()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors">
                Back
            </button>
            <button onclick="applyAllSuggestions()" class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-all shadow-md flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Apply Refined Version
            </button>
        </div>
    `;
}

function closeRefinePromptModal() {
    document.getElementById('refinePromptModal').classList.add('hidden');
}

function previewRefinedPrompt() {
    if (!window.currentRefinedPrompt) return;

    const resultsDiv = document.getElementById('refinePromptResults');
    resultsDiv.innerHTML = `
        <div class="mb-4">
            <button onclick="backToSuggestions()" class="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
                Back to Suggestions
            </button>
        </div>

        <h4 class="font-semibold text-gray-900 mb-3">Complete Refined System Prompt</h4>
        <p class="text-sm text-gray-500 mb-4">This is the AI's recommended version with all suggestions applied.</p>

        <div class="bg-gray-50 rounded-lg border border-gray-200 p-4 max-h-80 overflow-y-auto">
            <pre class="whitespace-pre-wrap text-sm font-mono text-gray-800">${escapeHtml(window.currentRefinedPrompt)}</pre>
        </div>

        <div class="mt-2 text-sm text-gray-500">
            ${window.currentRefinedPrompt.length} / 9000 characters
        </div>

        <div class="mt-6 flex justify-between">
            <button onclick="showComparisonView()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
                Compare with Original
            </button>
            <button onclick="applyAllSuggestions()" class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition-all shadow-md flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Apply This Version
            </button>
        </div>
    `;
}

function backToSuggestions() {
    // Restore cached suggestions HTML instead of making new API call
    if (window.cachedSuggestionsHTML) {
        const resultsDiv = document.getElementById('refinePromptResults');
        if (resultsDiv) {
            resultsDiv.innerHTML = window.cachedSuggestionsHTML;
        }
    } else {
        // Fallback: if no cache, re-fetch (shouldn't normally happen)
        refineSystemPrompt();
    }
}

function showSuggestionsView() {
    // Alias for backToSuggestions for clearer intent
    backToSuggestions();
}

function applyRefinedPrompt() {
    if (!window.currentRefinedPrompt) return;

    const previousLength = agentConfig.systemPrompt?.length || 0;
    const truncatedPrompt = truncateSystemPrompt(window.currentRefinedPrompt);
    agentConfig.systemPrompt = truncatedPrompt;

    // Update the textarea
    const textarea = document.getElementById('systemPrompt');
    if (textarea) {
        textarea.value = truncatedPrompt;
        updateSystemPromptCharCount();
    }

    const newLength = truncatedPrompt.length;
    const lengthChange = newLength - previousLength;
    const changeText = lengthChange > 0 ? `+${lengthChange}` : `${lengthChange}`;

    showToast(`✅ Refined prompt applied! (${changeText} chars)`, 'success');

    closeRefinePromptModal();
}

// ============================================================================
// APPLY OPTIMIZATION RECOMMENDATIONS
// ============================================================================

function applyKnowledgeBaseRecommendations() {
    const recommendations = window.currentOptimizationRecommendations;
    if (!recommendations || !recommendations.addKnowledgeBases) return;

    let addedCount = 0;
    recommendations.addKnowledgeBases.forEach(kb => {
        addKnowledgeBase(kb.name, kb.content);
        addedCount++;
    });

    showToast(`✅ Added ${addedCount} knowledge base${addedCount > 1 ? 's' : ''} successfully!`, 'success');

    // Verify the KBs were actually added
    console.log(`✅ Total KBs after add: ${knowledgeBases.length}`);
    const lastKB = knowledgeBases[knowledgeBases.length - 1];
    console.log(`✅ Last added KB:`, {
        id: lastKB.id,
        name: lastKB.name,
        contentLength: lastKB.content?.length || 0,
        contentPreview: lastKB.content?.substring(0, 100) + '...'
    });

    // Navigate to KB step to show the new additions
    currentStep = 4;
    updateStepDisplay();

    // Close modal after brief delay
    setTimeout(() => {
        closeOptimizeModal();
    }, 1000);
}

function applyOutputRecommendations() {
    const recommendations = window.currentOptimizationRecommendations;
    if (!recommendations || !recommendations.addOutputs) return;

    let addedCount = 0;
    recommendations.addOutputs.forEach(output => {
        outputCounter++;
        const newOutput = {
            id: `output-${outputCounter}`,
            outputName: output.outputName || output.functionName || '',
            functionName: output.functionName || '',
            functionDescription: output.functionDescription || '',
            outputType: output.outputType || 'report',
            artifactType: output.artifactType || 'text',
            jsonSchema: output.jsonSchema || ''
        };
        outputs.push(newOutput);
        addedCount++;
    });

    renderOutputs();
    showToast(`✅ Added ${addedCount} output${addedCount > 1 ? 's' : ''} successfully!`, 'success');

    // Verify the outputs were actually added
    console.log(`✅ Total outputs after add: ${outputs.length}`);
    const lastOutput = outputs[outputs.length - 1];
    console.log(`✅ Last added output:`, {
        id: lastOutput.id,
        outputName: lastOutput.outputName,
        functionName: lastOutput.functionName,
        outputType: lastOutput.outputType,
        artifactType: lastOutput.artifactType,
        hasJsonSchema: !!lastOutput.jsonSchema
    });

    // Navigate to Outputs step
    currentStep = 5;
    updateStepDisplay();

    setTimeout(() => {
        closeOptimizeModal();
    }, 1000);
}

function applySystemPromptEnhancement() {
    const recommendations = window.currentOptimizationRecommendations;
    if (!recommendations || !recommendations.enhanceSystemPrompt) return;

    const currentPrompt = agentConfig.systemPrompt || '';
    const enhancement = recommendations.enhanceSystemPrompt;

    // Append enhancement with clear separator, then truncate if needed
    const combinedPrompt = truncateSystemPrompt(currentPrompt + '\n\n' + enhancement);
    agentConfig.systemPrompt = combinedPrompt;

    // Update the textarea
    const textarea = document.getElementById('systemPrompt');
    if (textarea) {
        textarea.value = combinedPrompt;
        updateSystemPromptCharCount();
    }

    showToast('✅ System prompt enhanced successfully!', 'success');

    // Navigate to agent config step
    currentStep = 3;
    updateStepDisplay();

    setTimeout(() => {
        closeOptimizeModal();
    }, 1000);
}

function applyParameterAdjustments() {
    const recommendations = window.currentOptimizationRecommendations;
    if (!recommendations || !recommendations.adjustParameters) return;

    const params = recommendations.adjustParameters;
    let changes = [];

    if (params.temperature !== undefined) {
        agentConfig.temperature = params.temperature;
        const tempSlider = document.getElementById('temperature');
        const tempValue = document.getElementById('temperatureValue');
        if (tempSlider) tempSlider.value = params.temperature;
        if (tempValue) tempValue.textContent = params.temperature;
        changes.push(`Temperature: ${params.temperature}`);
    }

    if (params.maxToolsIterations !== undefined) {
        agentConfig.maxToolsIterations = params.maxToolsIterations;
        const iterInput = document.getElementById('maxToolsIterations');
        if (iterInput) iterInput.value = params.maxToolsIterations;
        changes.push(`Max Iterations: ${params.maxToolsIterations}`);
    }

    showToast(`✅ Updated parameters: ${changes.join(', ')}`, 'success');

    // Navigate to agent config step
    currentStep = 3;
    updateStepDisplay();

    setTimeout(() => {
        closeOptimizeModal();
    }, 1000);
}

async function applyAllRecommendations() {
    const recommendations = window.currentOptimizationRecommendations;
    if (!recommendations) return;

    const previousScore = window.currentOptimizationScore || 0;
    let actions = [];
    let addedKBs = 0;
    let addedOutputs = 0;

    // Apply parameters first (no navigation)
    if (recommendations.adjustParameters) {
        const params = recommendations.adjustParameters;
        if (params.temperature !== undefined) {
            agentConfig.temperature = params.temperature;
            const tempSlider = document.getElementById('temperature');
            const tempValue = document.getElementById('temperatureValue');
            if (tempSlider) tempSlider.value = params.temperature;
            if (tempValue) tempValue.textContent = params.temperature;
        }
        if (params.maxToolsIterations !== undefined) {
            agentConfig.maxToolsIterations = params.maxToolsIterations;
            const iterInput = document.getElementById('maxToolsIterations');
            if (iterInput) iterInput.value = params.maxToolsIterations;
        }
        actions.push('parameters');
    }

    // Apply system prompt enhancement (no navigation)
    if (recommendations.enhanceSystemPrompt) {
        const currentPrompt = agentConfig.systemPrompt || '';
        const combinedPrompt = truncateSystemPrompt(currentPrompt + '\n\n' + recommendations.enhanceSystemPrompt);
        agentConfig.systemPrompt = combinedPrompt;
        const textarea = document.getElementById('systemPrompt');
        if (textarea) {
            textarea.value = combinedPrompt;
            updateSystemPromptCharCount();
        }
        actions.push('system prompt');
    }

    // Add knowledge bases (no navigation)
    if (recommendations.addKnowledgeBases && recommendations.addKnowledgeBases.length > 0) {
        recommendations.addKnowledgeBases.forEach(kb => {
            addKnowledgeBase(kb.name, kb.content);
            addedKBs++;
        });
        actions.push(`${addedKBs} KB(s)`);
    }

    // Add outputs (no navigation)
    if (recommendations.addOutputs && recommendations.addOutputs.length > 0) {
        recommendations.addOutputs.forEach(output => {
            outputCounter++;
            const newOutput = {
                id: `output-${outputCounter}`,
                outputName: output.outputName || output.functionName || '',
                functionName: output.functionName || '',
                functionDescription: output.functionDescription || '',
                outputType: output.outputType || 'report',
                artifactType: output.artifactType || 'text',
                jsonSchema: output.jsonSchema || ''
            };
            outputs.push(newOutput);
            addedOutputs++;
        });
        renderOutputs();
        actions.push(`${addedOutputs} output(s)`);
    }

    if (actions.length > 0) {
        // Log what was applied
        console.log(`✅ Applied ${actions.length} types of recommendations:`, actions);
        console.log(`✅ Final state - KBs: ${knowledgeBases.length}, Outputs: ${outputs.length}`);
        console.log(`✅ Temperature: ${agentConfig.temperature}, Max Iterations: ${agentConfig.maxToolsIterations}`);
        console.log(`✅ System Prompt Length: ${agentConfig.systemPrompt?.length || 0} chars`);

        showToast(`🎉 Applied: ${actions.join(', ')}. Re-analyzing agent...`, 'success', 3000);

        // Wait a moment then re-analyze
        setTimeout(async () => {
            await reAnalyzeAfterChanges(previousScore);
        }, 1500);
    } else {
        setTimeout(() => {
            closeOptimizeModal();
        }, 1000);
    }
}

async function reAnalyzeAfterChanges(previousScore) {
    const resultsDiv = document.getElementById('optimizationResults');

    // Show re-analyzing message
    resultsDiv.innerHTML = `
        <div class="text-center py-12">
            <div class="inline-flex items-center gap-3">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span class="text-gray-600">Re-analyzing updated agent configuration...</span>
            </div>
        </div>
    `;

    try {
        const analysisPrompt = `You are an AI agent optimization expert. Analyze this UPDATED agent configuration and provide a brief quality assessment.

**Agent Configuration:**
- Name: ${agentConfig.name}
- Domain: ${agentConfig.domain}
- Model: ${agentConfig.model}
- Temperature: ${agentConfig.temperature}
- Max Tools Iterations: ${agentConfig.maxToolsIterations}
- Number of Knowledge Bases: ${knowledgeBases.length}
- Number of Outputs: ${outputs.length}
- System Prompt Length: ${agentConfig.systemPrompt?.length || 0} characters

**System Prompt Preview:**
${agentConfig.systemPrompt?.substring(0, 500)}...

**Knowledge Bases:**
${knowledgeBases.map((kb, i) => `${i + 1}. ${kb.name} (${kb.content?.length || 0} chars)`).join('\n')}

**Outputs:**
${outputs.map((out, i) => `${i + 1}. ${out.functionName} (${out.outputType})`).join('\n')}

Provide a brief updated analysis with:
1. **Overall Quality Score** - Rate 0-100 with justification
2. **What Improved** - List the improvements from the applied recommendations
3. **Remaining Opportunities** - Any remaining gaps (if score < 95)

Format as HTML with h4 tags and color classes: text-green-600 for positive, text-amber-600 for suggestions.`;

        const response = await claudeAPI.sendMessage(analysisPrompt, []);

        // Extract new score
        const scoreMatch = response.match(/(\d+)\/100/);
        const newScore = scoreMatch ? parseInt(scoreMatch[1]) : 0;
        const scoreImprovement = newScore - previousScore;

        resultsDiv.innerHTML = `
            <div class="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 mb-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900">✅ Recommendations Applied Successfully!</h3>
                        <p class="text-sm text-gray-600 mt-1">Agent configuration has been updated</p>
                    </div>
                    <div class="text-right">
                        <div class="text-3xl font-bold text-green-600">${newScore}/100</div>
                        ${scoreImprovement > 0 ? `
                            <div class="text-sm font-medium text-green-600">
                                +${scoreImprovement} points improved! 🎉
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            <div class="prose max-w-none">
                ${response}
            </div>
            <div class="mt-6 pt-4 border-t border-gray-200 text-center">
                <button onclick="closeOptimizeModal()" class="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-6 rounded-lg transition-colors">
                    Done
                </button>
            </div>
        `;

        window.currentOptimizationScore = newScore;

    } catch (error) {
        resultsDiv.innerHTML = `
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p class="text-yellow-900"><strong>⚠️ Applied but couldn't re-analyze:</strong> ${error.message}</p>
                <p class="text-sm text-yellow-700 mt-2">Your changes have been applied successfully. Close this modal to continue.</p>
                <button onclick="closeOptimizeModal()" class="mt-3 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                    Close
                </button>
            </div>
        `;
    }
}

// ============================================================================
// TEST AGENT FUNCTIONS
// ============================================================================

const testChatHistory = [];

// Sample queries by domain
const domainSampleQueries = {
    marketing: [
        "Create a campaign plan for launching a new product on social media",
        "What's the best way to allocate a $50K budget across Meta and Google?",
        "How do I improve my campaign's conversion rate?",
        "Analyze this campaign: 100K impressions, 2K clicks, 50 conversions"
    ],
    "Marketing Analytics & Reporting": [
        "Generate a performance report for my Q4 paid media campaigns",
        "What were the top performing campaigns last month by ROAS?",
        "Create an executive summary comparing Meta vs Google Ads performance",
        "Show me which audience segments had the highest conversion rates"
    ],
    "Customer Data Platform & Marketing Analytics": [
        "Create customer segments based on RFM analysis",
        "Which customer segments have the highest lifetime value?",
        "Analyze purchase patterns for our top 20% of customers",
        "Identify at-risk customers who haven't purchased in 90 days"
    ],
    "Marketing Automation & Customer Experience": [
        "Design a welcome email journey for new subscribers",
        "Create an abandoned cart recovery workflow",
        "What's the optimal send time for our email campaigns?",
        "Build a re-engagement campaign for inactive users"
    ],
    "Paid Media & Campaign Analytics": [
        "Optimize budget allocation across Meta, Google, and TikTok",
        "Which ad creatives are driving the best performance?",
        "Calculate ROAS and CPA for all active campaigns",
        "Recommend budget adjustments based on performance trends"
    ],
    sales: [
        "How do I qualify a lead effectively?",
        "Create an email template for following up with prospects",
        "What's the best way to handle price objections?",
        "Help me prepare for a discovery call with an enterprise client"
    ],
    support: [
        "How do I handle an angry customer complaint?",
        "Create a knowledge base article about password resets",
        "What's the escalation process for critical issues?",
        "Help me write a response to a refund request"
    ],
    hr: [
        "Create an onboarding checklist for new engineers",
        "How do I handle a performance improvement plan?",
        "What are best practices for conducting interviews?",
        "Help me write a job description for a senior product manager"
    ],
    it: [
        "How do I troubleshoot a network connectivity issue?",
        "Create a security incident response plan",
        "What's the best way to manage software licenses?",
        "Help me document our backup and recovery process"
    ]
};

function openTestAgentModal() {
    const modal = document.getElementById('testAgentModal');
    const agentNameSpan = document.getElementById('testAgentName');
    const domainSpan = document.getElementById('testAgentDomain');
    const sampleQueriesDiv = document.getElementById('sampleQueries');
    const messagesDiv = document.getElementById('testChatMessages');

    // Check if all required elements exist
    if (!modal || !agentNameSpan || !domainSpan || !sampleQueriesDiv || !messagesDiv) {
        console.error('❌ Test Agent Modal elements not found in DOM');
        showToast('⚠️ Test Agent modal not properly initialized. Please refresh the page.', 'error');
        return;
    }

    // Set agent name and domain
    agentNameSpan.textContent = agentConfig.name || 'Your Agent';
    domainSpan.textContent = agentConfig.domain || 'general topics';

    // Load sample queries
    const queries = domainSampleQueries[agentConfig.domain] || [
        "What can you help me with?",
        "Tell me about your capabilities",
        "How do I get started?",
        "What kind of questions can I ask?"
    ];

    sampleQueriesDiv.innerHTML = queries.map(query => `
        <button
            onclick="fillTestQuery('${query.replace(/'/g, "\\'")}')"
            class="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-full transition-colors"
        >${query}</button>
    `).join('');

    // Clear previous chat
    testChatHistory.length = 0;
    messagesDiv.innerHTML = `
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p class="text-sm text-blue-900">
                <strong>👋 Welcome!</strong> This is a simulation of how your agent will respond.
                Try asking questions related to: <strong class="text-blue-700">${agentConfig.domain || 'general topics'}</strong>
            </p>
        </div>
    `;

    modal.classList.remove('hidden');
}

function closeTestAgentModal() {
    document.getElementById('testAgentModal').classList.add('hidden');
}

function fillTestQuery(query) {
    document.getElementById('testChatInput').value = query;
    document.getElementById('testChatInput').focus();
}

async function sendTestMessage() {
    const input = document.getElementById('testChatInput');
    const message = input.value.trim();

    if (!message) return;

    // Add user message to chat
    addTestMessage('user', message);
    input.value = '';

    // Show typing indicator
    const messagesDiv = document.getElementById('testChatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'testTypingIndicator';
    typingDiv.className = 'bg-white border border-gray-200 rounded-lg p-4';
    typingDiv.innerHTML = `
        <div class="flex items-center gap-2 text-gray-600 text-sm">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
            <span>${agentConfig.name || 'Agent'} is thinking...</span>
        </div>
    `;
    messagesDiv.appendChild(typingDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    try {
        // Build test prompt
        const testPrompt = `You are simulating this agent:

**Agent Name:** ${agentConfig.name}
**Domain:** ${agentConfig.domain}
**System Prompt:**
${agentConfig.systemPrompt}

**Available Knowledge Bases:**
${knowledgeBases.map(kb => `- ${kb.name}: ${kb.content?.substring(0, 200)}...`).join('\n')}

**Available Outputs:**
${outputs.map(out => `- ${out.functionName}: ${out.functionDescription}`).join('\n')}

User Question: "${message}"

Respond as this agent would, referencing relevant knowledge bases and mentioning when you would use specific outputs. Keep responses concise (2-3 paragraphs). Be helpful and stay in character.`;

        const response = await claudeAPI.sendMessage(testPrompt, testChatHistory);

        // Remove typing indicator
        typingDiv.remove();

        // Add agent response
        addTestMessage('agent', response);

        // Add to history
        testChatHistory.push({
            role: 'user',
            content: message
        });
        testChatHistory.push({
            role: 'assistant',
            content: response
        });

    } catch (error) {
        typingDiv.remove();
        addTestMessage('error', `❌ Error: ${error.message}. Please ensure TD LLM API is running.`);
    }
}

function addTestMessage(role, content) {
    const messagesDiv = document.getElementById('testChatMessages');
    const messageDiv = document.createElement('div');

    if (role === 'user') {
        messageDiv.className = 'bg-indigo-50 border border-indigo-200 rounded-lg p-4';
        messageDiv.innerHTML = `
            <p class="text-sm text-indigo-900"><strong>You:</strong> ${content}</p>
        `;
    } else if (role === 'error') {
        messageDiv.className = 'bg-red-50 border border-red-200 rounded-lg p-4';
        messageDiv.innerHTML = `<p class="text-sm text-red-900">${content}</p>`;
    } else {
        messageDiv.className = 'bg-white border border-gray-200 rounded-lg p-4';
        messageDiv.innerHTML = `
            <p class="text-sm text-gray-900"><strong>${agentConfig.name || 'Agent'}:</strong></p>
            <div class="text-sm text-gray-800 mt-2">${content}</div>
        `;
    }

    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function clearTestChat() {
    testChatHistory.length = 0;
    const messagesDiv = document.getElementById('testChatMessages');
    messagesDiv.innerHTML = `
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p class="text-sm text-blue-900">
                <strong>👋 Welcome!</strong> This is a simulation of how your agent will respond.
                Try asking questions related to: <strong class="text-blue-700">${agentConfig.domain || 'general topics'}</strong>
            </p>
        </div>
    `;
}

// Enter key handler for test chat
document.addEventListener('DOMContentLoaded', function() {
    const testInput = document.getElementById('testChatInput');
    if (testInput) {
        testInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendTestMessage();
            }
        });
    }

    // Attach button click handlers
    const optimizeBtn = document.getElementById('optimizeAgentBtn');
    if (optimizeBtn) {
        optimizeBtn.addEventListener('click', optimizeAgent);
    }

    const testBtn = document.getElementById('testAgentBtn');
    if (testBtn) {
        testBtn.addEventListener('click', openTestAgentModal);
    }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

// Load auto-saved data on page load
document.addEventListener('DOMContentLoaded', function() {
    // Try to load auto-save after a brief delay to allow other initializations
    setTimeout(() => {
        loadFromLocalStorage();
    }, 500);
});
