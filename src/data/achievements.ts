import type { Achievement } from "../types/appData";

export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  ["primeira-sessao", "Primeira sessão", "Primeiro treino registrado."],
  ["primeira-semana", "Primeira semana completa", "Semana com ritmo real."],
  ["consistencia-15", "15 dias de consistência", "Duas semanas em movimento."],
  ["consistencia-30", "30 dias de consistência", "Um mês construindo base."],
  ["primeiro-pr", "Primeiro PR", "Recorde pessoal registrado."],
  ["leg-press-up", "Subiu carga no Leg Press", "Progressão no Leg Press."],
  ["supino-up", "Subiu carga no Supino", "Progressão no Supino."],
  ["remada-up", "Subiu carga na Remada", "Progressão na Remada."],
  ["checkin-em-dia", "Check-in em dia", "Check-in de 15 dias salvo."],
  ["sem-tontura", "Semana sem tontura", "Treinos sem alerta de tontura."],
  ["sem-dor-articular", "Semana sem dor articular", "Articulações sob controle."],
  ["musculacoes-3", "3 musculações na semana", "Treino A, B e C feitos."],
  ["boxe-concluido", "Boxe concluído", "Técnica limpa registrada."],
  ["handles-concluido", "Handles concluído", "Controle de bola registrado."],
  ["danca-concluida", "Dança concluída", "Movimento técnico registrado."],
].map(([id, title, description]) => ({ id, title, description }));
