
export const DEFAULT_CONTRACT_TEMPLATE = `CONTRATO DE PRÉSTAMO DE DINERO CON INTERESES ENTRE PARTICULARES

En Madrid, a \${today}.

REUNIDOS

De una parte, como PRESTAMISTA (Acreedor):
D. BIENVENIDO NEFTALI FELIZ TOLENTINO, mayor de edad, con D.N.I. nº 18476199T, con domicilio a efectos de este contrato en Madrid.

Y de otra parte, como PRESTATARIO (Deudor):
D./Dña. \${fullName}, mayor de edad, con DNI/NIE \${idNumber} y domicilio a efectos de notificaciones en \${address}.

Ambas partes intervienen en su propio nombre y derecho, reconociéndose mutuamente la capacidad legal necesaria para formalizar el presente CONTRATO DE PRÉSTAMO, y a tal efecto,

EXPONEN

I. Que el PRESTAMISTA entrega en este acto al PRESTATARIO la cantidad de \${loanAmount} EUROS (€), mediante transferencia bancaria o efectivo.

II. Que el PRESTATARIO reconoce haber recibido dicha cantidad a su entera satisfacción, obligándose a su devolución junto con los intereses pactados, con sujeción a las siguientes:

CLÁUSULAS

PRIMERA. OBJETO DEL CONTRATO.
El Prestamista presta al Prestatario la cantidad de \${loanAmount} €, que ingresan en este acto en el patrimonio del deudor. Este documento sirve como eficaz carta de pago y reconocimiento de deuda por el importe mencionado.

SEGUNDA. INTERESES REMUNERATORIOS.
El capital prestado devengará un interés fijo pactado del \${interestRate}% MENSUAL. El Prestatario acepta expresamente este tipo de interés, declarando conocer y asumir el coste financiero de la operación, el cual no considera desproporcionado dadas las características del préstamo y el riesgo asumido.

TERCERA. FORMA DE DEVOLUCIÓN (AMORTIZACIÓN).
El Prestatario devolverá el capital más los intereses mediante el pago de cuotas mensuales consecutivas. El pago se realizará preferiblemente mediante transferencia bancaria a la cuenta que designe el Prestamista o en efectivo contra recibo. El impago de cualquier cuota generará mora automática.

CUARTA. VENCIMIENTO ANTICIPADO.
De conformidad con lo establecido en la legislación vigente, el Prestamista se reserva la facultad de dar por vencido anticipadamente el préstamo y exigir judicialmente la devolución de la TOTALIDAD del capital pendiente más los intereses devengados hasta la fecha, si el Prestatario dejara de pagar UNA SOLA de las cuotas a su vencimiento.

QUINTA. INTERESES DE DEMORA.
En caso de impago a su vencimiento, la cantidad adeudada devengará, de forma automática y sin necesidad de requerimiento previo, un interés de demora adicional equivalente al tipo de interés legal del dinero vigente incrementado en 10 puntos porcentuales.

SEXTA. GASTOS Y COSTAS JUDICIALES.
Serán de cuenta exclusiva del Prestatario todos los gastos derivados del presente contrato. En caso de incumplimiento, el Prestatario asume expresamente el pago de todos los gastos judiciales y extrajudiciales (incluyendo honorarios de Abogado y Procurador, burofaxes y gastos de gestión de cobro) que el Prestamista deba realizar para recuperar su dinero.

SÉPTIMA. OBLIGACIONES FISCALES.
Las partes declaran conocer la obligación de presentar este contrato ante la oficina liquidadora competente del Impuesto sobre Transmisiones Patrimuidas y Actos Jurídicos Documentados (Modelo 600), siendo dicha gestión responsabilidad del Prestatario si así se acordase o fuese requerido.

OCTAVA. PROTECCIÓN DE DATOS.
Los datos personales del Prestatario se incorporan a un fichero responsabilidad del Prestamista con la única finalidad de gestionar la relación contractual y el cobro de la deuda. El Prestatario autoriza el tratamiento de sus datos y de la copia de su documento de identidad para estos fines.

NOVENA. JURISDICCIÓN.
Para la resolución de cualquier controversia, las partes, con renuncia a su propio fuero, se someten expresamente a los Juzgados y Tribunales de la ciudad de MADRID (o del domicilio del Prestamista).

Y en prueba de conformidad, firman el presente por duplicado y a un solo efecto.

EL PRESTAMISTA:                            EL PRESTATARIO:
                                            
Fdo: Bienvenido N. Feliz T.                Fdo: \${fullName}
`;
