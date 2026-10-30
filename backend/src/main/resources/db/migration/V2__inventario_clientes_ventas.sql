create table producto (
  tienda_id uuid not null references tienda (id),
  codigo varchar(30) not null,
  referencia varchar(40) not null default '',
  nombre varchar(120) not null,
  costo bigint not null check (costo >= 0),
  existencias integer not null, -- admite negativos
  primary key (tienda_id, codigo)
);
create index producto_referencia on producto (tienda_id, lower(referencia));

create table cliente (
  tienda_id uuid not null references tienda (id),
  codigo varchar(30) not null,
  nombre varchar(120) not null,
  telefono varchar(20) not null default '',
  correo varchar(120) not null default '',
  direccion varchar(300) not null default '',
  primary key (tienda_id, codigo)
);
create unique index cliente_nombre_unico on cliente (tienda_id, lower(nombre));

create table venta (
  tienda_id uuid not null references tienda (id),
  codigo varchar(30) not null,
  fecha timestamptz not null default now(),
  cliente varchar(120) not null,
  metodo varchar(30) not null,
  usuario varchar(120) not null,
  total bigint not null check (total >= 0),
  primary key (tienda_id, codigo)
);
create index venta_fecha on venta (tienda_id, fecha);

create table venta_item (
  tienda_id uuid not null,
  venta_codigo varchar(30) not null,
  linea integer not null,
  producto_codigo varchar(30) not null,
  nombre varchar(120) not null,
  cantidad integer not null check (cantidad >= 1),
  valor_unitario bigint not null check (valor_unitario >= 1),
  primary key (tienda_id, venta_codigo, linea),
  foreign key (tienda_id, venta_codigo) references venta (tienda_id, codigo)
);

-- Una anulación es la devolución de todo lo que quedaba de la venta
create table devolucion (
  tienda_id uuid not null references tienda (id),
  codigo varchar(30) not null,
  venta_codigo varchar(30) not null,
  fecha timestamptz not null default now(),
  tipo varchar(12) not null check (tipo in ('devolucion', 'anulacion')),
  motivo varchar(200) not null,
  usuario varchar(120) not null,
  cliente varchar(120) not null,
  metodo varchar(30) not null,
  total bigint not null check (total >= 0),
  primary key (tienda_id, codigo),
  foreign key (tienda_id, venta_codigo) references venta (tienda_id, codigo)
);

create table devolucion_item (
  tienda_id uuid not null,
  devolucion_codigo varchar(30) not null,
  linea integer not null,
  producto_codigo varchar(30) not null,
  nombre varchar(120) not null,
  cantidad integer not null check (cantidad >= 1),
  valor_unitario bigint not null check (valor_unitario >= 1),
  primary key (tienda_id, devolucion_codigo, linea),
  foreign key (tienda_id, devolucion_codigo) references devolucion (tienda_id, codigo)
);

-- Tablas que ya consultan las reglas de ventas y clientes; sus endpoints llegan en la siguiente fase
create table pago (
  tienda_id uuid not null references tienda (id),
  codigo varchar(30) not null,
  fecha timestamptz not null default now(),
  tipo varchar(12) not null check (tipo in ('abono', 'proveedor')),
  tercero_codigo varchar(30),
  tercero varchar(120) not null,
  concepto varchar(120) not null,
  metodo varchar(30) not null,
  valor bigint not null check (valor > 0),
  usuario varchar(120) not null,
  primary key (tienda_id, codigo)
);

create table caja (
  tienda_id uuid not null references tienda (id),
  codigo varchar(30) not null,
  apertura timestamptz not null default now(),
  base bigint not null check (base >= 0),
  cierre_fecha timestamptz,
  contado bigint,
  esperado bigint,
  primary key (tienda_id, codigo)
);
-- Solo puede haber una caja abierta por tienda
create unique index caja_una_abierta on caja (tienda_id) where cierre_fecha is null;

create table cierre_contable (
  tienda_id uuid not null references tienda (id),
  dia date not null,
  cerrado_en timestamptz not null default now(),
  usuario varchar(120) not null,
  resumen jsonb not null,
  primary key (tienda_id, dia)
);
