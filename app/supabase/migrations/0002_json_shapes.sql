-- Garante o formato dos campos JSON: um bug de codificação dupla gravava texto em vez de lista.
-- Com isso o banco recusa a gravação errada em vez de quebrar a tela depois.
update brand_kits set colors = (colors #>> '{}')::jsonb where jsonb_typeof(colors) = 'string';
update brand_kits set fonts = (fonts #>> '{}')::jsonb where jsonb_typeof(fonts) = 'string';
update icps set demographics = (demographics #>> '{}')::jsonb where jsonb_typeof(demographics) = 'string';

alter table brand_kits
  add constraint colors_is_array check (jsonb_typeof(colors) = 'array'),
  add constraint fonts_is_array check (jsonb_typeof(fonts) = 'array'),
  add constraint proof_points_is_array check (jsonb_typeof(proof_points) = 'array');
alter table icps add constraint demographics_is_object check (jsonb_typeof(demographics) = 'object');
