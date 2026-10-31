-- 1. El método de pago "Fiado" pasa a llamarse "Crédito"
alter table tienda alter column metodos_pago set default 'Efectivo,Nequi,Tarjeta,Transferencia,Crédito';
update tienda set metodos_pago = regexp_replace(metodos_pago, '(^|,)Fiado(,|$)', '\1Crédito\2');
update venta set metodo = 'Crédito' where metodo = 'Fiado';
update devolucion set metodo = 'Crédito' where metodo = 'Fiado';
update pago set metodo = 'Crédito' where metodo = 'Fiado';

-- 2. Ventas y devoluciones se relacionan con el cliente por su código (la deuda ya no depende del nombre)
alter table venta add column cliente_codigo varchar(30);
alter table devolucion add column cliente_codigo varchar(30);
update venta v set cliente_codigo = c.codigo
  from cliente c where c.tienda_id = v.tienda_id and lower(c.nombre) = lower(v.cliente);
update devolucion d set cliente_codigo = v.cliente_codigo
  from venta v where v.tienda_id = d.tienda_id and v.codigo = d.venta_codigo;
create index venta_cliente on venta (tienda_id, cliente_codigo);

-- 3. Un documento pasado a otro (cotización -> remisión o factura, remisión -> factura) guarda a cuál se pasó
alter table documento rename column facturada_en to convertido_en;
alter table documento add column documento_origen varchar(30);

-- 4. Códigos nuevos. Las claves foráneas se quitan mientras se renombran y se vuelven a crear al final.
alter table venta_item drop constraint venta_item_tienda_id_venta_codigo_fkey;
alter table devolucion drop constraint devolucion_tienda_id_venta_codigo_fkey;
alter table devolucion_item drop constraint devolucion_item_tienda_id_devolucion_codigo_fkey;

-- Facturas: V-0001 -> F1
update venta set codigo = 'F' || (regexp_replace(codigo, '\D', '', 'g'))::bigint where codigo ~ '^V-\d+$';
update venta_item set venta_codigo = 'F' || (regexp_replace(venta_codigo, '\D', '', 'g'))::bigint where venta_codigo ~ '^V-\d+$';
update devolucion set venta_codigo = 'F' || (regexp_replace(venta_codigo, '\D', '', 'g'))::bigint where venta_codigo ~ '^V-\d+$';

-- Notas: ND-0001 -> ND1 y NA-0001 -> NA1 (cada tipo conserva su propio consecutivo)
update devolucion set codigo = substr(codigo, 1, 2) || (regexp_replace(codigo, '\D', '', 'g'))::bigint where codigo ~ '^N[DA]-\d+$';
update devolucion_item set devolucion_codigo = substr(devolucion_codigo, 1, 2) || (regexp_replace(devolucion_codigo, '\D', '', 'g'))::bigint
  where devolucion_codigo ~ '^N[DA]-\d+$';

-- Productos: P-001 -> 1 (los IDs de producto son solo números)
update producto set codigo = (regexp_replace(codigo, '\D', '', 'g'))::bigint::text where codigo ~ '^P-\d+$';
update venta_item set producto_codigo = (regexp_replace(producto_codigo, '\D', '', 'g'))::bigint::text where producto_codigo ~ '^P-\d+$';
update devolucion_item set producto_codigo = (regexp_replace(producto_codigo, '\D', '', 'g'))::bigint::text where producto_codigo ~ '^P-\d+$';
update documento_item set producto_codigo = (regexp_replace(producto_codigo, '\D', '', 'g'))::bigint::text where producto_codigo ~ '^P-\d+$';

alter table venta_item add foreign key (tienda_id, venta_codigo) references venta (tienda_id, codigo);
alter table devolucion add foreign key (tienda_id, venta_codigo) references venta (tienda_id, codigo);
alter table devolucion_item add foreign key (tienda_id, devolucion_codigo) references devolucion (tienda_id, codigo);

-- 5. Consecutivos: facturas, remisiones y cotizaciones comparten "DOC"; los productos usan el mayor código más uno
insert into consecutivo (tienda_id, clave, ultimo)
  select tienda_id, 'DOC', max(ultimo) from consecutivo where clave in ('V', 'REM', 'COT') group by tienda_id
  on conflict (tienda_id, clave) do update set ultimo = greatest(consecutivo.ultimo, excluded.ultimo);
delete from consecutivo where clave in ('V', 'REM', 'COT', 'P');

-- Solo números en el código de producto
alter table producto add constraint producto_codigo_numerico check (codigo ~ '^\d{1,12}$') not valid;
