-- Monto recibido y devuelta en facturas pagadas en efectivo, observaciones y origen de la factura
alter table venta
  add column recibido bigint not null default 0 check (recibido >= 0),
  add column devuelta bigint not null default 0 check (devuelta >= 0),
  add column observaciones varchar(300) not null default '',
  add column documento_origen varchar(30);

-- Remisiones (REM) y cotizaciones (COT). La remisión descuenta stock sin cobrar; la cotización no mueve nada.
-- Ambas se pasan a factura: facturada_en guarda el código de la venta.
create table documento (
  tienda_id uuid not null references tienda (id),
  codigo varchar(30) not null,
  tipo varchar(12) not null check (tipo in ('remision', 'cotizacion')),
  fecha timestamptz not null default now(),
  vigencia_hasta timestamptz,
  cliente varchar(120) not null,
  usuario varchar(120) not null,
  observaciones varchar(300) not null default '',
  total bigint not null check (total >= 0),
  facturada_en varchar(30),
  anulado boolean not null default false,
  motivo_anulacion varchar(200),
  primary key (tienda_id, codigo)
);
create index documento_fecha on documento (tienda_id, fecha);

create table documento_item (
  tienda_id uuid not null,
  documento_codigo varchar(30) not null,
  linea int not null,
  producto_codigo varchar(30) not null,
  nombre varchar(120) not null,
  cantidad int not null check (cantidad > 0),
  valor_unitario bigint not null check (valor_unitario >= 0),
  primary key (tienda_id, documento_codigo, linea),
  foreign key (tienda_id, documento_codigo) references documento (tienda_id, codigo)
);
