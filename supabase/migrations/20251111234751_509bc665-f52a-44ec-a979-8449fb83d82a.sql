-- Adicionar coluna draw_odd à tabela odds para suportar mercados de 3 vias (futebol)
ALTER TABLE public.odds 
ADD COLUMN draw_odd numeric;