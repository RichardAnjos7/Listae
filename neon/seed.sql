-- Seed de categorias e produtos globais (Neon)
insert into public.categories (name, icon, display_order) values
  ('Açougue', '🥩', 1),
  ('Hortifrúti', '🥬', 2),
  ('Laticínios', '🥛', 3),
  ('Padaria', '🥖', 4),
  ('Higiene', '🧴', 5),
  ('Limpeza', '🧽', 6),
  ('Bebidas', '🥤', 7),
  ('Mercearia', '🍚', 8),
  ('Frios', '🧀', 9),
  ('Congelados', '❄️', 10)
on conflict do nothing;

insert into public.products (name, brand, unit, category_id, is_global, created_by)
select v.name, v.brand, v.unit, c.id, true, null
from (values
  ('Picanha', 'Friboi', 'kg', 'Açougue'),
  ('Peito de frango', 'Sadia', 'kg', 'Açougue'),
  ('Banana prata', null, 'kg', 'Hortifrúti'),
  ('Tomate', null, 'kg', 'Hortifrúti'),
  ('Alface', null, 'un', 'Hortifrúti'),
  ('Leite integral', 'Parmalat', 'L', 'Laticínios'),
  ('Iogurte natural', 'Nestlé', 'un', 'Laticínios'),
  ('Queijo mussarela', 'Tirolez', 'kg', 'Laticínios'),
  ('Pão francês', null, 'kg', 'Padaria'),
  ('Pão de forma', 'Wickbold', 'un', 'Padaria'),
  ('Sabonete', 'Lux', 'un', 'Higiene'),
  ('Papel higiênico', 'Neve', 'un', 'Higiene'),
  ('Detergente', 'Ypê', 'un', 'Limpeza'),
  ('Água mineral', 'Crystal', 'L', 'Bebidas'),
  ('Refrigerante', 'Coca-Cola', 'L', 'Bebidas'),
  ('Arroz', 'Tio João', 'kg', 'Mercearia'),
  ('Feijão preto', 'Camil', 'kg', 'Mercearia'),
  ('Açúcar', 'União', 'kg', 'Mercearia'),
  ('Óleo de soja', 'Soya', 'L', 'Mercearia'),
  ('Presunto', 'Sadia', 'kg', 'Frios'),
  ('Pizza congelada', 'Seara', 'un', 'Congelados')
) as v(name, brand, unit, cat_name)
join public.categories c on c.name = v.cat_name
where not exists (select 1 from public.products limit 1);
