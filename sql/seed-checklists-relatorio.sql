-- =============================================================================
-- SEED: Modelos de Checklist para Relatórios Pré e Pós Obra
-- =============================================================================
-- Executar no Supabase SQL Editor
-- As seções são armazenadas no campo config (JSONB) como {"secao": "Nome"}
-- pois a tabela checklist_modelo_itens não possui coluna 'secao'.
-- =============================================================================

DO $$
DECLARE
  v_pre_obra_id  UUID := gen_random_uuid();
  v_pos_obra_id  UUID := gen_random_uuid();
BEGIN

  -- =========================================================================
  -- MODELO 1: Relatório Pré-Obra
  -- =========================================================================
  INSERT INTO checklist_modelos (id, nome, descricao, tipo)
  VALUES (
    v_pre_obra_id,
    'Relatório Pré-Obra',
    'Checklist completo de vistoria pré-obra com fotos, medições e assinaturas',
    'vistoria'
  );

  INSERT INTO checklist_modelo_itens
    (id, checklist_modelo_id, pergunta, descricao, tipo_resposta, obrigatorio, opcoes, config, categoria, ordem)
  VALUES
    -- SEÇÃO CHEGADA
    (gen_random_uuid(), v_pre_obra_id, 'Foto da fachada ao chegar', NULL, 'foto', true, NULL, '{"secao": "Chegada"}', 'verificacao', 1),
    (gen_random_uuid(), v_pre_obra_id, 'Placa Critéria posicionada', NULL, 'foto', true, NULL, '{"secao": "Chegada"}', 'verificacao', 2),
    (gen_random_uuid(), v_pre_obra_id, 'Horário de chegada', NULL, 'hora', false, NULL, '{"secao": "Chegada"}', 'verificacao', 3),
    (gen_random_uuid(), v_pre_obra_id, 'Estado geral do local', NULL, 'texto', false, NULL, '{"secao": "Chegada"}', 'verificacao', 4),

    -- SEÇÃO PADRÃO ENTRADA
    (gen_random_uuid(), v_pre_obra_id, 'Fachada do padrão - caixa do medidor', NULL, 'foto', true, NULL, '{"secao": "Padrão Entrada"}', 'verificacao', 5),
    (gen_random_uuid(), v_pre_obra_id, 'Padrão aberto - interno', NULL, 'foto', false, NULL, '{"secao": "Padrão Entrada"}', 'verificacao', 6),
    (gen_random_uuid(), v_pre_obra_id, 'Amperagem do disjuntor geral', NULL, 'texto', false, NULL, '{"secao": "Padrão Entrada"}', 'verificacao', 7),
    (gen_random_uuid(), v_pre_obra_id, 'Bitola dos cabos de entrada', NULL, 'texto', false, NULL, '{"secao": "Padrão Entrada"}', 'verificacao', 8),
    (gen_random_uuid(), v_pre_obra_id, 'Irregularidades/Gatos encontrados', NULL, 'checkbox', false, NULL, '{"secao": "Padrão Entrada"}', 'verificacao', 9),
    (gen_random_uuid(), v_pre_obra_id, 'Detalhe das irregularidades', NULL, 'texto', false, NULL, '{"secao": "Padrão Entrada"}', 'verificacao', 10),
    (gen_random_uuid(), v_pre_obra_id, 'Medidor aterrado', NULL, 'checkbox', false, NULL, '{"secao": "Padrão Entrada"}', 'verificacao', 11),

    -- SEÇÃO QUADRO GERAL
    (gen_random_uuid(), v_pre_obra_id, 'Interno do quadro - tampa aberta', NULL, 'foto', true, NULL, '{"secao": "Quadro Geral"}', 'verificacao', 12),
    (gen_random_uuid(), v_pre_obra_id, 'Disjuntores existentes', NULL, 'foto', false, NULL, '{"secao": "Quadro Geral"}', 'verificacao', 13),
    (gen_random_uuid(), v_pre_obra_id, 'Haste de aterramento existente', NULL, 'checkbox', false, NULL, '{"secao": "Quadro Geral"}', 'verificacao', 14),
    (gen_random_uuid(), v_pre_obra_id, 'Barramento de terra no quadro', NULL, 'checkbox', false, NULL, '{"secao": "Quadro Geral"}', 'verificacao', 15),

    -- SEÇÃO INFRAESTRUTURA
    (gen_random_uuid(), v_pre_obra_id, 'Rota de passagem dos cabos', NULL, 'foto', true, NULL, '{"secao": "Infraestrutura"}', 'verificacao', 16),
    (gen_random_uuid(), v_pre_obra_id, 'Tensão Fase 1 (V)', NULL, 'numero', false, NULL, '{"secao": "Infraestrutura"}', 'verificacao', 17),
    (gen_random_uuid(), v_pre_obra_id, 'Tensão Fase 2 (V)', NULL, 'numero', false, NULL, '{"secao": "Infraestrutura"}', 'verificacao', 18),
    (gen_random_uuid(), v_pre_obra_id, 'Tensão Fase 3 (V)', NULL, 'numero', false, NULL, '{"secao": "Infraestrutura"}', 'verificacao', 19),
    (gen_random_uuid(), v_pre_obra_id, 'Local definido para o inversor', NULL, 'foto', false, NULL, '{"secao": "Infraestrutura"}', 'verificacao', 20),

    -- SEÇÃO TELHADO
    (gen_random_uuid(), v_pre_obra_id, 'Área de instalação panorâmica', NULL, 'foto', true, NULL, '{"secao": "Telhado"}', 'verificacao', 21),
    (gen_random_uuid(), v_pre_obra_id, 'Telhas quebradas/trincadas', NULL, 'checkbox', false, NULL, '{"secao": "Telhado"}', 'verificacao', 22),
    (gen_random_uuid(), v_pre_obra_id, 'Detalhe telhas com defeito', NULL, 'texto', false, NULL, '{"secao": "Telhado"}', 'verificacao', 23),
    (gen_random_uuid(), v_pre_obra_id, 'Estado cumeeiras e rufos', NULL, 'foto', false, NULL, '{"secao": "Telhado"}', 'verificacao', 24),
    (gen_random_uuid(), v_pre_obra_id, 'Tipo de telha', NULL, 'selecao_unica', false, '["Cerâmica","Fibrocimento","Metálica","Colonial PVC","Policarbonato","Outro"]', '{"secao": "Telhado"}', 'verificacao', 25),

    -- SEÇÃO INTERIOR/FORRO
    (gen_random_uuid(), v_pre_obra_id, 'Forro dos cômodos abaixo do telhado', NULL, 'foto', true, NULL, '{"secao": "Interior/Forro"}', 'verificacao', 26),
    (gen_random_uuid(), v_pre_obra_id, 'Marcas de infiltração pré-existentes', NULL, 'checkbox', false, NULL, '{"secao": "Interior/Forro"}', 'verificacao', 27),
    (gen_random_uuid(), v_pre_obra_id, 'Detalhe da infiltração', NULL, 'texto', false, NULL, '{"secao": "Interior/Forro"}', 'verificacao', 28),
    (gen_random_uuid(), v_pre_obra_id, 'Mofo ou umidade no gesso/madeira', NULL, 'checkbox', false, NULL, '{"secao": "Interior/Forro"}', 'verificacao', 29),
    (gen_random_uuid(), v_pre_obra_id, 'Vigas e caibros do sótão', NULL, 'foto', false, NULL, '{"secao": "Interior/Forro"}', 'verificacao', 30),

    -- SEÇÃO ASSINATURA
    (gen_random_uuid(), v_pre_obra_id, 'Nome completo do técnico', NULL, 'texto', true, NULL, '{"secao": "Assinatura"}', 'documentacao', 31),
    (gen_random_uuid(), v_pre_obra_id, 'CPF do técnico', NULL, 'texto', true, NULL, '{"secao": "Assinatura"}', 'documentacao', 32),
    (gen_random_uuid(), v_pre_obra_id, 'Assinatura do técnico', NULL, 'assinatura', true, NULL, '{"secao": "Assinatura"}', 'documentacao', 33),
    (gen_random_uuid(), v_pre_obra_id, 'Nome completo do cliente', NULL, 'texto', true, NULL, '{"secao": "Assinatura"}', 'documentacao', 34),
    (gen_random_uuid(), v_pre_obra_id, 'CPF do cliente', NULL, 'texto', true, NULL, '{"secao": "Assinatura"}', 'documentacao', 35),
    (gen_random_uuid(), v_pre_obra_id, 'Assinatura do cliente', NULL, 'assinatura', true, NULL, '{"secao": "Assinatura"}', 'documentacao', 36);

  -- =========================================================================
  -- MODELO 2: Relatório Pós-Obra
  -- =========================================================================
  INSERT INTO checklist_modelos (id, nome, descricao, tipo)
  VALUES (
    v_pos_obra_id,
    'Relatório Pós-Obra',
    'Checklist completo de finalização pós-obra com testes, medições e assinaturas',
    'vistoria'
  );

  INSERT INTO checklist_modelo_itens
    (id, checklist_modelo_id, pergunta, descricao, tipo_resposta, obrigatorio, opcoes, config, categoria, ordem)
  VALUES
    -- SEÇÃO SISTEMA
    (gen_random_uuid(), v_pos_obra_id, 'Foto completa do sistema instalado', NULL, 'foto', true, NULL, '{"secao": "Sistema"}', 'instalacao', 1),
    (gen_random_uuid(), v_pos_obra_id, 'Estrutura conforme projeto', NULL, 'checkbox', true, NULL, '{"secao": "Sistema"}', 'instalacao', 2),
    (gen_random_uuid(), v_pos_obra_id, 'Fixação adequada e segura', NULL, 'checkbox', true, NULL, '{"secao": "Sistema"}', 'instalacao', 3),
    (gen_random_uuid(), v_pos_obra_id, 'Telhado preservado', NULL, 'checkbox', true, NULL, '{"secao": "Sistema"}', 'instalacao', 4),
    (gen_random_uuid(), v_pos_obra_id, 'Tipo instalação', NULL, 'selecao_unica', false, '["Embutido","Tubo Metálico","Eletrocalha"]', '{"secao": "Sistema"}', 'instalacao', 5),
    (gen_random_uuid(), v_pos_obra_id, 'Quantidade de strings', NULL, 'numero', false, NULL, '{"secao": "Sistema"}', 'instalacao', 6),
    (gen_random_uuid(), v_pos_obra_id, 'Nº série do inversor', NULL, 'texto', false, NULL, '{"secao": "Sistema"}', 'instalacao', 7),

    -- SEÇÃO CONEXÕES CC
    (gen_random_uuid(), v_pos_obra_id, 'Conexões CC corretas', NULL, 'checkbox', true, NULL, '{"secao": "Conexões CC"}', 'instalacao', 8),
    (gen_random_uuid(), v_pos_obra_id, 'Polaridade MC4 correta', NULL, 'checkbox', true, NULL, '{"secao": "Conexões CC"}', 'instalacao', 9),
    (gen_random_uuid(), v_pos_obra_id, 'Proteções CC instaladas', NULL, 'checkbox', false, NULL, '{"secao": "Conexões CC"}', 'instalacao', 10),
    (gen_random_uuid(), v_pos_obra_id, 'String 1 - Tensão V', NULL, 'numero', false, NULL, '{"secao": "Conexões CC"}', 'instalacao', 11),
    (gen_random_uuid(), v_pos_obra_id, 'String 2 - Tensão V', NULL, 'numero', false, NULL, '{"secao": "Conexões CC"}', 'instalacao', 12),
    (gen_random_uuid(), v_pos_obra_id, 'String 3 - Tensão V', NULL, 'numero', false, NULL, '{"secao": "Conexões CC"}', 'instalacao', 13),
    (gen_random_uuid(), v_pos_obra_id, 'String 4 - Tensão V', NULL, 'numero', false, NULL, '{"secao": "Conexões CC"}', 'instalacao', 14),

    -- SEÇÃO CONEXÕES CA
    (gen_random_uuid(), v_pos_obra_id, 'Proteções CA instaladas', NULL, 'checkbox', true, NULL, '{"secao": "Conexões CA"}', 'instalacao', 15),
    (gen_random_uuid(), v_pos_obra_id, 'Montagem conector AC correta', NULL, 'checkbox', false, NULL, '{"secao": "Conexões CA"}', 'instalacao', 16),
    (gen_random_uuid(), v_pos_obra_id, 'Bornes AC inversor torqueados', NULL, 'checkbox', false, NULL, '{"secao": "Conexões CA"}', 'instalacao', 17),
    (gen_random_uuid(), v_pos_obra_id, 'Inversor compatível ao projeto', NULL, 'checkbox', false, NULL, '{"secao": "Conexões CA"}', 'instalacao', 18),
    (gen_random_uuid(), v_pos_obra_id, 'Inversor aterrado', NULL, 'checkbox', false, NULL, '{"secao": "Conexões CA"}', 'instalacao', 19),

    -- SEÇÃO QPCA
    (gen_random_uuid(), v_pos_obra_id, 'Foto QPCA aberto', NULL, 'foto', true, NULL, '{"secao": "QPCA"}', 'instalacao', 20),
    (gen_random_uuid(), v_pos_obra_id, 'Disjuntor e DPS compatíveis', NULL, 'checkbox', false, NULL, '{"secao": "QPCA"}', 'instalacao', 21),
    (gen_random_uuid(), v_pos_obra_id, 'Bornes torqueados', NULL, 'checkbox', false, NULL, '{"secao": "QPCA"}', 'instalacao', 22),
    (gen_random_uuid(), v_pos_obra_id, 'Etiqueta/QR Code', NULL, 'checkbox', false, NULL, '{"secao": "QPCA"}', 'instalacao', 23),
    (gen_random_uuid(), v_pos_obra_id, 'Quadro vedado', NULL, 'checkbox', false, NULL, '{"secao": "QPCA"}', 'instalacao', 24),
    (gen_random_uuid(), v_pos_obra_id, 'Medição Terra/Neutro', NULL, 'texto', false, NULL, '{"secao": "QPCA"}', 'instalacao', 25),
    (gen_random_uuid(), v_pos_obra_id, 'Medição Neutro/Fase 1', NULL, 'texto', false, NULL, '{"secao": "QPCA"}', 'instalacao', 26),

    -- SEÇÃO ATERRAMENTO
    (gen_random_uuid(), v_pos_obra_id, 'Aterramento do sistema', NULL, 'checkbox', true, NULL, '{"secao": "Aterramento"}', 'seguranca', 27),
    (gen_random_uuid(), v_pos_obra_id, 'Aterramento do padrão', NULL, 'checkbox', false, NULL, '{"secao": "Aterramento"}', 'seguranca', 28),
    (gen_random_uuid(), v_pos_obra_id, 'Aterramento dos perfis', NULL, 'foto', false, NULL, '{"secao": "Aterramento"}', 'seguranca', 29),

    -- SEÇÃO TESTES
    (gen_random_uuid(), v_pos_obra_id, 'AC ligado - contagem regressiva', NULL, 'checkbox', false, NULL, '{"secao": "Testes"}', 'testes', 30),
    (gen_random_uuid(), v_pos_obra_id, 'DC ligado - tensões OK', NULL, 'checkbox', false, NULL, '{"secao": "Testes"}', 'testes', 31),
    (gen_random_uuid(), v_pos_obra_id, 'Potência máxima registrada', NULL, 'texto', false, NULL, '{"secao": "Testes"}', 'testes', 32),
    (gen_random_uuid(), v_pos_obra_id, 'MPPT 1 Tensão', NULL, 'texto', false, NULL, '{"secao": "Testes"}', 'testes', 33),
    (gen_random_uuid(), v_pos_obra_id, 'MPPT 2 Tensão', NULL, 'texto', false, NULL, '{"secao": "Testes"}', 'testes', 34),
    (gen_random_uuid(), v_pos_obra_id, 'Foto inversor funcionando', NULL, 'foto', true, NULL, '{"secao": "Testes"}', 'testes', 35),

    -- SEÇÃO MONITORAMENTO
    (gen_random_uuid(), v_pos_obra_id, 'Planta monitoramento criada', NULL, 'checkbox', false, NULL, '{"secao": "Monitoramento"}', 'instalacao', 36),
    (gen_random_uuid(), v_pos_obra_id, 'Monitoramento configurado', NULL, 'checkbox', false, NULL, '{"secao": "Monitoramento"}', 'instalacao', 37),
    (gen_random_uuid(), v_pos_obra_id, 'Tipo internet', NULL, 'selecao_unica', false, '["Cabeada","Wi-fi Cliente","Wi-fi Criteria"]', '{"secao": "Monitoramento"}', 'instalacao', 38),
    (gen_random_uuid(), v_pos_obra_id, 'Nº série datalogger', NULL, 'texto', false, NULL, '{"secao": "Monitoramento"}', 'instalacao', 39),
    (gen_random_uuid(), v_pos_obra_id, 'Login monitoramento', NULL, 'texto', false, NULL, '{"secao": "Monitoramento"}', 'instalacao', 40),

    -- SEÇÃO FINALIZAÇÃO
    (gen_random_uuid(), v_pos_obra_id, 'Pronto para comissionamento', NULL, 'checkbox', true, NULL, '{"secao": "Finalização"}', 'finalizacao', 41),
    (gen_random_uuid(), v_pos_obra_id, 'Limpeza realizada', NULL, 'checkbox', true, NULL, '{"secao": "Finalização"}', 'finalizacao', 42),
    (gen_random_uuid(), v_pos_obra_id, 'Voo drone realizado', NULL, 'checkbox', false, NULL, '{"secao": "Finalização"}', 'finalizacao', 43),
    (gen_random_uuid(), v_pos_obra_id, 'Conforme pré-obra', NULL, 'checkbox', false, NULL, '{"secao": "Finalização"}', 'finalizacao', 44),
    (gen_random_uuid(), v_pos_obra_id, 'Resultado', NULL, 'selecao_unica', false, '["Aprovado","Reprovado"]', '{"secao": "Finalização"}', 'finalizacao', 45),

    -- SEÇÃO ASSINATURA
    (gen_random_uuid(), v_pos_obra_id, 'Nome completo do técnico', NULL, 'texto', true, NULL, '{"secao": "Assinatura"}', 'documentacao', 46),
    (gen_random_uuid(), v_pos_obra_id, 'CPF do técnico', NULL, 'texto', true, NULL, '{"secao": "Assinatura"}', 'documentacao', 47),
    (gen_random_uuid(), v_pos_obra_id, 'Assinatura do técnico', NULL, 'assinatura', true, NULL, '{"secao": "Assinatura"}', 'documentacao', 48),
    (gen_random_uuid(), v_pos_obra_id, 'Nome completo do cliente', NULL, 'texto', true, NULL, '{"secao": "Assinatura"}', 'documentacao', 49),
    (gen_random_uuid(), v_pos_obra_id, 'CPF do cliente', NULL, 'texto', true, NULL, '{"secao": "Assinatura"}', 'documentacao', 50),
    (gen_random_uuid(), v_pos_obra_id, 'Assinatura do cliente', NULL, 'assinatura', true, NULL, '{"secao": "Assinatura"}', 'documentacao', 51);

END $$;
