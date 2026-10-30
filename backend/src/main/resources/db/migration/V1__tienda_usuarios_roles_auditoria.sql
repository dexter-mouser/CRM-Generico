-- Base multitienda: cada tabla de negocio lleva tienda_id.
create extension if not exists unaccent;

create table tienda (
  id uuid primary key default gen_random_uuid(),
  nombre varchar(120) not null,
  nit varchar(30) not null default '',
  telefono varchar(20) not null default '',
  ciudad varchar(120) not null default '',
  direccion varchar(300) not null default '',
  pie_recibo varchar(300) not null default '',
  mostrar_datos_tienda boolean not null default true,
  permitir_sin_existencias boolean not null default false,
  metodos_pago varchar(200) not null default 'Efectivo,Nequi,Tarjeta,Transferencia,Fiado',
  zona_horaria varchar(60) not null default 'America/Bogota',
  creada_en timestamptz not null default now()
);

create table rol (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references tienda (id),
  clave varchar(60) not null,
  nombre varchar(60) not null,
  descripcion varchar(300) not null default '',
  protegido boolean not null default false,
  unique (tienda_id, clave)
);
create unique index rol_nombre_unico on rol (tienda_id, lower(nombre));

create table rol_permiso (
  rol_id uuid not null references rol (id) on delete cascade,
  modulo varchar(40) not null,
  accion varchar(20) not null,
  primary key (rol_id, modulo, accion)
);

create table usuario (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references tienda (id),
  nombre varchar(120) not null,
  correo varchar(120) not null,
  clave_hash varchar(100),
  rol_id uuid not null references rol (id),
  activo boolean not null default true,
  intentos_fallidos integer not null default 0,
  bloqueado_hasta timestamptz,
  creado_en timestamptz not null default now()
);
create unique index usuario_correo_unico on usuario (lower(correo));

-- Auditoría: solo se agregan registros. Ni la aplicación ni nadie con el mismo usuario puede cambiarlos o borrarlos.
create table auditoria (
  id bigserial primary key,
  tienda_id uuid references tienda (id),
  fecha timestamptz not null default now(),
  usuario varchar(120) not null,
  modulo varchar(40) not null,
  accion varchar(80) not null,
  detalle varchar(400) not null default ''
);
create index auditoria_tienda_fecha on auditoria (tienda_id, fecha desc);

create function auditoria_solo_agregar() returns trigger language plpgsql as $$
begin
  raise exception 'La auditoría solo admite nuevos registros';
end;
$$;
create trigger auditoria_sin_cambios before update or delete on auditoria
  for each row execute function auditoria_solo_agregar();
create trigger auditoria_sin_vaciado before truncate on auditoria
  for each statement execute function auditoria_solo_agregar();

-- Números consecutivos por tienda (V-0001, P-001, ...)
create table consecutivo (
  tienda_id uuid not null references tienda (id),
  clave varchar(10) not null,
  ultimo bigint not null default 0,
  primary key (tienda_id, clave)
);
