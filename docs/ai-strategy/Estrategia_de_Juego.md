# Estrategia de juego King — especificación para la IA

Fuente: `Estrategia_de_Juego_v4.xlsx` (Francisco, revisado con Claude el 7-nov-2026). Este Markdown es la versión legible del mismo contenido; si hay diferencias, manda el Excel.

Hojas: 1) Estrategia por mano · 2) Errores bobos · 3) Parámetros · 4) Niveles · 5) Reglas alternativas · 6) Pendientes.

## 1. Estrategia por mano

Columnas: Buen juego / Mal juego = cómo evaluar la mano repartida; Temas a revisar = qué contar; Estrategia general = principios; Estrategia específica = tácticas de esa mano.

### No Bazas

**Buen Juego**

- Cartas bajas
- Alguna pinta falla o casi falla
- Cartas altas acompañadas de varias cartas bajas de la misma pinta

**Mal Juego**

- Cartas altas sin posibilidad de defensa (sin cartas bajas de la misma pinta o sin pintas fallas)

**Temas a revisar**

- Cuántas cartas de cada pinta se tiene en la mano
- Cartas altas y bajas de cada pinta
- Pintas fallas (cero cartas de una pinta) o casi fallas (dos o menos cartas de una pinta)
- Esto permite saber, por ejemplo, con cuál carta liderar en caso de ser el primero o después de ganar una baza
- Posición en la baza (1º, 2º, 3º o 4º en jugar)

**Estrategia de Juego General**

- Siempre llevar las cuentas sobre cuáles cartas han salido y, ojalá, quién puso cada carta. Esto permite saber cuál carta jugar en cada momento.
- Intentar no ganar bazas, pero usando la carta más alta posible (la más alta que todavía pierde)
- Intentar deshacerse de las pintas casi fallas, esperando quedar fallo y poder descartar cuando se juegue esa pinta
- Si se coge la mano, entender cuándo y con cuál carta se suelta la mano
- Si no hay forma de perder la baza (te van a obligar a ganarla), gánala con la carta más alta que tengas de esa pinta, para al menos quitártela de encima.
- La posición en la baza importa: jugando de último se tiene información completa (se sabe exactamente qué carta pierde y cuál gana); jugando de segundo casi no hay información, ahí se debe ser más conservador.

**Estrategia Específica a Esta Mano**

- En ocasiones es mejor salir con cartas altas "peligrosas" (cuando están mal acompañadas o se tienen pocas y altas de una pinta) y hacerse las bazas al principio del juego, comparado con esperar a que al final del juego uno coja la mano cuando ya no tiene cómo librarse de ella y se gane todas las bazas que quedan.
- El valor de cada baza es relativamente bajo, por lo que en ocasiones es mejor hacer un par de bazas a ganarse seis o siete.
- Cuando uno lidera, el juego se debe analizar completo: cuántas cartas de cada pinta se tiene en la mano, cuáles cartas son "peligrosas", cuántas veces ha jugado cada pinta, cuántas cartas de cada pinta han salido, cuál pinta puede ser peligrosa y en cuál hay posibilidades de defenderse con cartas bajas o con las más bajas en juego (en ocasiones una carta alta puede ser la más baja en juego).
- Regla para el computador: salir temprano con una carta peligrosa solo si esa pinta no tiene defensa (menos de 3 cartas más bajas) y todavía ningún rival está fallo en ella.

### No Corazones

**Buen Juego**

- Muchos corazones, idealmente bajos: tener muchos corazones implica pocas cartas de las otras pintas, por lo que quedarás fallo pronto y podrás descartar corazones en bazas ajenas
- Tener cartas bajas para soltar la mano

**Mal Juego**

- Pocos corazones o solo corazones altos
- Solo cartas altas de una pinta
- Muchos corazones altos sin bajos: si al final del juego te quedas con la mano y eres el único con corazones, te los llevas todos (te toca liderarlos y nadie más tiene)

**Temas a revisar**

- Cuántos corazones
- Pintas peligrosas (solo cartas altas)
- Pintas no peligrosas (fallas o casi fallas)
- Quién está fallo en cada pinta (esos jugadores pueden descartarte corazones cuando ganes una baza de esa pinta)

**Estrategia de Juego General**

- Siempre llevar las cuentas sobre cuáles cartas han salido y, ojalá, quién puso cada carta. Esto permite saber cuál carta jugar en cada momento.
- Intentar deshacerse de las pintas casi fallas, esperando quedar fallo y poder descartar cuando se juegue esa pinta
- Si se coge la mano, entender cuándo y con cuál carta se suelta la mano
- La posición en la baza importa: jugando de último se tiene información completa (se sabe exactamente qué carta pierde y cuál gana); jugando de segundo casi no hay información, ahí se debe ser más conservador.

**Estrategia Específica a Esta Mano**

- Sacar las cartas altas de cada pinta lo más rápido posible en el juego (uno no quiere quedarse con cartas altas en caso de coger la mano y no poder soltarla)
- Cuando se juegue la segunda o tercera mano de cada pinta, tener cuidado si se coge la mano, pues si se tienen pocos corazones es posible quedarse con ella y empezar a recibir corazones debido a la regla de no liderar corazones hasta que solo se tengan corazones
- Llevar siempre las cuentas para saber cuáles cartas han salido y cuáles corazones han salido
- Siempre tener presente cuál es el corazón más alto que aún está en juego
- Cuando estés fallo en la pinta jugada, descarta primero tus corazones más altos.
- Si tienes muchos corazones, descártalos a lo largo del juego: no llegues al final con la mano y solo corazones.

### J's & K's

**Buen Juego**

- Cartas bajas
- Alguna pinta falla o casi falla
- En caso de tener cartas altas, que estén acompañadas de cartas bajas

**Mal Juego**

- Solo cartas altas en una pinta
- Tener J's o K's sin posibilidad de defensa (menos de 3 cartas más bajas de esa pinta)

**Temas a revisar**

- Cuántas cartas de cada pinta se tiene en la mano
- Cuántas cartas peligrosas (no solo J's y K's, también Aces y Q's)
- Pintas fallas o casi fallas

**Estrategia de Juego General**

- Siempre llevar las cuentas sobre cuáles cartas han salido y, ojalá, quién puso cada carta. Esto permite saber cuál carta jugar en cada momento.
- Intentar deshacerse de las pintas casi fallas, esperando quedar fallo y poder descartar cuando se juegue esa pinta (en ocasiones esto implica llevarse una J o una K, analizar riesgo)
- Si se coge la mano, entender cuándo y con cuál carta se suelta la mano
- La posición en la baza importa: jugando de último se tiene información completa (se sabe exactamente qué carta pierde y cuál gana); jugando de segundo casi no hay información, ahí se debe ser más conservador.

**Estrategia Específica a Esta Mano**

- Es importante llevar la cuenta de los Aces y las Q's que han salido de cada pinta, además del número de veces que ha jugado cada pinta y la cantidad de cartas que han salido de esas pintas
- Hay J's y K's que pueden ser inevitables para el jugador, en ese caso es mejor ganarlas temprano en el juego
- La idea es descartar las cartas más altas que no generen riesgo de llevarse una J o K. Por ejemplo al jugar de último, intentar ganar la mano con Aces o Q's si no hay J's o K's presentes
- Intentar quedar fallo en alguna pinta para poder descartar cartas peligrosas (J's, Q's, K's o Aces)
- Nunca liderar con un As o una Q de una pinta si la J o la K de esa pinta aún no ha salido y no la tienes tú (alguien puede botarla debajo de tu carta)
- Analizar cuáles jugadores han quedado fallos en cuáles pintas y llevar la cuenta de si ya no tienen J's o K's para descartar
- Las últimas manos del juego siempre son peligrosas, tener presente, en la medida de lo posible, cuáles cartas se dejan para el final del juego
- La K es más difícil de proteger que la J: solo pierde contra el As. Con una K sin defensa, conviene que salga primero el As de esa pinta o descartarla estando fallo.

### Q's

**Buen Juego**

- Cartas bajas
- Alguna pinta falla o casi falla
- En caso de tener cartas altas, que estén acompañadas de cartas bajas

**Mal Juego**

- Solo cartas altas en una pinta
- Tener Q's sin posibilidad de defensa (menos de 3 cartas más bajas de esa pinta)

**Temas a revisar**

- Cuántas cartas de cada pinta se tiene en la mano
- Cuántas cartas peligrosas (no solo Q's, también Aces y K's)
- Pintas fallas o casi fallas

**Estrategia de Juego General**

- Siempre llevar las cuentas sobre cuáles cartas han salido y, ojalá, quién puso cada carta. Esto permite saber cuál carta jugar en cada momento.
- Intentar deshacerse de las pintas casi fallas, esperando quedar fallo y poder descartar cuando se juegue esa pinta (en ocasiones esto implica llevarse una Q, analizar riesgo)
- Si se coge la mano, entender cuándo y con cuál carta se suelta la mano
- La posición en la baza importa: jugando de último se tiene información completa (se sabe exactamente qué carta pierde y cuál gana); jugando de segundo casi no hay información, ahí se debe ser más conservador.

**Estrategia Específica a Esta Mano**

- Es importante llevar la cuenta de los Aces y las K's que han salido de cada pinta, además del número de veces que ha jugado cada pinta y la cantidad de cartas que han salido de esas pintas
- Hay Q's que pueden ser inevitables para el jugador, en ese caso es mejor ganarlas temprano en el juego
- La idea es descartar las cartas más altas que no generen riesgo de llevarse una Q. Por ejemplo al jugar de último, intentar ganar la mano con Aces o K's si no hay Q's presentes
- Intentar quedar fallo en alguna pinta para poder descartar cartas peligrosas (Q's, K's o Aces)
- Nunca liderar con un As o una K de una pinta si la Q de esa pinta aún no ha salido y no la tienes tú
- Analizar cuáles jugadores han quedado fallos en cuáles pintas y llevar la cuenta de si ya no tienen Q's para descartar
- Las últimas manos del juego siempre son peligrosas, tener presente, en la medida de lo posible, cuáles cartas se dejan para el final del juego

### K❤️

**Buen Juego**

- Muchos corazones
- Tener la K de Corazones (excepto si viene con pocos o ningún otro corazón)
- Tener cartas bajas para defenderse en caso necesario

**Mal Juego**

- Pocos corazones o ningún corazón
- Muchas cartas altas de una pinta
- No tener la posibilidad de defenderse
- Tener el As de corazones sin corazones bajos (alguien puede botar la K♥ debajo de tu As)

**Temas a revisar**

- Cuántas manos se han jugado de cada pinta
- Jugadores que estén fallos en una pinta y no hayan lanzado la K de Corazones (probablemente no la tienen)
- Cuántos corazones han salido y cuáles
- Pintas peligrosas (solo cartas altas o que ya han jugado 2 o 3 veces)
- Pintas no peligrosas (fallas o casi fallas)

**Estrategia de Juego General**

- Siempre llevar las cuentas sobre cuáles cartas han salido y, ojalá, quién puso cada carta. Esto permite saber cuál carta jugar en cada momento.
- Intentar deshacerse de las pintas casi fallas, esperando quedar fallo y poder descartar cuando se juegue esa pinta
- Si se coge la mano, entender cuándo y con cuál carta se suelta la mano (debido a que no se pueden liderar corazones hasta tener únicamente corazones, es muy peligroso no poder soltar la mano)
- La posición en la baza importa: jugando de último se tiene información completa (se sabe exactamente qué carta pierde y cuál gana); jugando de segundo casi no hay información, ahí se debe ser más conservador.

**Estrategia Específica a Esta Mano**

- Sacar las cartas altas de cada pinta lo más rápido posible en el juego (uno no quiere quedarse con cartas altas en caso de coger la mano y no poder soltarla)
- Cuando se juegue la segunda o tercera mano de cada pinta, tener cuidado si se coge la mano, pues si se tienen pocos corazones es posible quedarse con ella
- Llevar siempre las cuentas para saber cuáles cartas han salido y cuáles corazones han salido
- Siempre tener presente si el As de corazones ya se jugó
- Si tienes la K de Corazones: descártala apenas estés fallo en la pinta jugada, o juégala cuando el As♥ ya esté en la mesa. Mientras tanto, en bazas de corazones juega un corazón más bajo.
- Si tienes el As de corazones y la K♥ no ha salido: en bazas de corazones juega un corazón más bajo; el As solo cuando la K♥ ya salió o la puedas descartar estando fallo.
- Siempre tener cuidado con la tercera y cuarta jugada de cada pinta (o con la segunda si se tienen juegos con muchas cartas de una pinta)
- La mano termina apenas alguien se lleva la K♥ (así está en el juego): lo único que importa es no ser quien se la lleve; no hay que pensar en las bazas que vendrían después.

### 2 ultimas

**Buen Juego**

- Cartas muy altas y cartas muy bajas de cada pinta
- Alguna pinta falla o casi falla
- Cartas muy bajas para poder defenderse en las dos últimas bazas

**Mal Juego**

- El llamado "juego de ombligo" (cartas intermedias de cada pinta, 7, 8, 9, 10). Estas son muy peligrosas pues no permiten coger la mano y tampoco permiten defenderse y agacharse para no coger la mano
- Solo cartas medianas o bajas que no permiten coger la mano y controlar el juego

**Temas a revisar**

- Esta es la mano en la cual es más importante llevar las cuentas de las cartas que han salido, cuántas veces ha jugado cada pinta, cuántas y cuáles de cada pinta han salido y si las cartas con las que uno se queda en la mano son las más bajas o no.

**Estrategia de Juego General**

- Siempre llevar las cuentas sobre cuáles cartas han salido y, ojalá, quién puso cada carta.
- Intenta deshacerte de las cartas altas de cada pinta y de las cartas medias. Trata de quedarte únicamente con las cartas más bajas o con cartas "infinitas" (que son las únicas que quedan de su pinta)
- Ojo: una carta infinita solo es buena si no te toca liderar. Si lideras con ella en las dos últimas bazas, ganas la baza.
- Intenta deshacerte de las pintas casi fallas, esperando quedar fallo y poder descartar cuando se juegue esa pinta
- La posición en la baza importa: jugando de último se tiene información completa (se sabe exactamente qué carta pierde y cuál gana); jugando de segundo casi no hay información, ahí se debe ser más conservador.

**Estrategia Específica a Esta Mano**

- En esta mano es muy importante poder coger la mano al principio para liderar con las cartas que sean más peligrosas de tu juego. No hacerlo quiere decir que te juegan las pintas que para otros son peligrosas y no podrás escoger con qué cartas quedarte para el final
- Es importante que guardes cartas altas para coger la mano, así signifique que no estás necesariamente descartando las cartas más altas al principio (por ejemplo guardas una K, cuando se juegue un As, de manera que después tengas la carta más alta de la pinta y puedas coger la mano)
- Intenta coger la mano, jugar las cartas peligrosas, y luego soltar la mano en el momento adecuado.
- Las primeras 11 bazas no cuestan nada: úsalas para coger la mano, soltar cartas medias y escoger con qué te quedas.
- Mano ideal para las 2 últimas: las cartas más bajas en juego de sus pintas, o estar fallo en lo que se va a jugar.
- Con 3 a 5 cartas en la mano, calcular las combinaciones posibles (en Difícil/Experto el computador calcula la jugada exacta).

### Positivas

**Buen Juego**

- Cartas altas
- Alguna pinta falla o casi falla (lo que significa que las otras pintas tienen muchas cartas, es decir una runfia)
- Aces, K's y Q's, en probabilidades son las cartas seguras para hacer bazas

**Mal Juego**

- Cartas bajas
- Una de las reglas del juego implica el cambio de juego, para todos los jugadores, si algún jugador no tiene ninguna figura (regla alternativa, activada por defecto) (este es el peor juego posible, pero se balancea con la posibilidad de cambio)
- Un juego 3, 3, 3, 4, es decir que las pintas se reparten de la manera más balanceada posible (en un juego así, que además no tenga muchas cartas altas, es muy difícil sacar buenos resultados)
- Con la regla de cambio de juego, el peor juego posible sería un 3, 3, 3, 4 con una única figura y que esa figura sea una J.

**Temas a revisar**

- Cuántas cartas de cada pinta se tiene en la mano
- Cartas altas y bajas de cada pinta
- Pintas fallas (cero cartas de una pinta) o casi fallas (dos o menos cartas de una pinta)
- En las positivas una decisión importante corresponde a la subasta del triunfo por parte del Dealer. Entender la cantidad potencial de bazas que uno pueda ganar es la clave para saber si ofertar bazas, intentar comprar el triunfo o cederlo. Igualmente, si uno es el dealer, si vender el triunfo o quedarse con él.
- Valor de las cartas (ver hoja Parámetros): cada As ≈ 1 baza; cada K ≈ 0,5-0,75 (más si la pinta está acompañada); cada Q ≈ 0,25 por defecto. Si todos los jugadores tuvieran 3-3-3-4 y la pinta se juega en orden, la Q es baza casi segura (salen As y K en las dos primeras rondas). Pero uno solo conoce su propia mano: si mi mano es 3-3-3-4 y la Q está acompañada, es probable que los demás también tengan 3 o más de esa pinta, y la Q sube a ≈ 0,5-0,75.
- En caso de no tener un juego 3, 3, 3, 4 se consideran otras cartas que pueden generar bazas, pues al tener 5, 6 o más cartas de una pinta los demás jugadores tendrán pocas (menos de 3)
- En general, ofrecer 3 o 4 bazas es una oferta muy grande (es difícil que uno pueda asegurar 6, 7 o más bazas) por lo que comprar con más bazas será muy riesgoso. No tiene sentido comprar por muchas y no hacer suficiente para uno. Solo en algunas ocasiones particulares, de juegos con muchas runfias, la mejor decisión es comprar por 4 bazas.
- Para el que vende, es difícil no aceptar una oferta de 3, 4 o más bazas. Incluso con buen juego, la garantía de vender significa que incluso sin saber la pinta del triunfo uno puede hacer las bazas por las que vendió más algunas otras que salgan del juego propio. Hay que tener una muy buena mano para no vender por 4 bazas, por ejemplo.

**Estrategia de Juego General**

- Siempre llevar las cuentas sobre cuáles cartas han salido y, ojalá, quién puso cada carta. Esto permite saber cuál carta jugar en cada momento.
- Intentar ganar la mayor cantidad de bazas, pero usando la carta más baja posible
- Con Matar Obligatorio (activado por defecto) no hay opción de agacharse si se tiene una carta que mata: "la más baja posible" significa la más baja que supera a la carta más alta de la mesa.
- Cuando se juega "matando" es importante asegurar las cartas en las que uno confía harán bazas (Aces, K's y Q's)
- Usar la regla de "matar" para intentar sacar las cartas que uno necesita que salgan (por ejemplo si tengo como carta más alta de una pinta la K, intentaré que primero salga el As, antes de que me toque lanzar la K y me la mate el As)
- Cuando se juega triunfo, intentar ganar la baza con la carta más baja posible. Excepto si se sabe que el siguiente jugador también está fallo, en ese caso utilizar la más alta esperando que el otro no tenga una mayor
- No liderar triunfos altos (K, Q) si el As de triunfo no ha salido, salvo para destriunfar con 5 o más triunfos fuertes.
- Evitar liderar una pinta en la que un rival que juega después ya está fallo y todavía tiene triunfos (te la corta), salvo que el objetivo sea sacarle sus triunfos.
- Si no puedes ganar la baza, bota tu carta más inútil; nunca un ganador seguro.
- La posición en la baza importa: jugando de último se tiene información completa (se sabe exactamente qué carta pierde y cuál gana); jugando de segundo casi no hay información, ahí se debe ser más conservador.
- Matar Obligatorio, como está en el juego: si alguien ya cortó con triunfo, los siguientes solo tienen que seguir la pinta (no superar la carta más alta). Si estás fallo y tus triunfos no superan un triunfo que ya está en la mesa, puedes jugar cualquier carta.

**Estrategia Específica a Esta Mano**

- El juego de las positivas inicia con la subasta, acá es importante intentar predecir cuántas bazas me puedo hacer con mi juego. Si yo estoy comprando, debo analizar la cantidad de bazas que me puedo hacer con mi juego (por ejemplo con el número de Aces y Ks; las Qs a veces sirven para hacer bazas, ver valores en la columna D y en la hoja Parámetros). Se debe analizar la cantidad de cartas de una pinta determinada, tanto hacia arriba como hacia abajo, pues hacia arriba será mi pinta fuerte, pero hacia abajo será la pinta que me dé oportunidades de hacer bazas a partir del uso de triunfo. Si voy a comprar, debo comparar mi juego donde yo pongo el triunfo en contra de que me pongan el triunfo bajo el escenario de mi peor pinta. Comprar me debe dejar siempre mejor parado en número de bazas al cierre del juego que si no comprara, por lo que no se trata de comprar alto solo por comprar. Se debe entender el límite de bazas que es posible ofrecer. Por ejemplo, los Aces siempre se pueden considerar bazas fijas, así uno ponga o no ponga el triunfo, incluso las Ks.
- Si yo estoy vendiendo el análisis es similar, la diferencia está en que si me voy a hacer las mismas bazas vendiendo, entonces mejor me quedo con el triunfo. En cambio si estoy comprando y me voy a hacer las mismas bazas comprando o no comprando, lo mejor es no comprar.
- El triunfo se debe cuidar. En ocasiones cuando uno tiene muchas cartas de triunfo, 5, 6 o más, y además son cartas fuertes As, K, Q, J, puedo hacer lo que se llama destriunfar. Las juego de entrada para sacarle a los demás jugadores sus triunfos. Esto me permite jugar con otras pintas que puedan ser medianamente fuertes y aún conservar algunos triunfos para coger la mano, siendo yo el único con triunfo después de la destriunfada.
- Es posible poner "negra" (sin triunfo: en lugar de escoger una pinta, se juega sin triunfo). En este caso es importante llevar bien las cuentas de lo que se ha jugado y lo que no. Hay que intentar hacerse la mayor cantidad de bazas cuando se tiene la mano o se lidera. Después puede ser difícil volver a coger la mano.
- Negra conviene con varios Aces y K's repartidos y alguna pinta larga encabezada por As o K: sin triunfo nadie corta, así que las pintas largas se cobran completas.
- En general se juega matando, por lo que hay que entender cómo usar la regla a su favor. Sirve para "sacar" cartas que me puedan servir para hacer otras bazas, ya sean de triunfo o de pinta normal.
- Con Jugar hacia abajo o Al revés activados la estrategia cambia: ver hoja Reglas alternativas.
- Cambio de juego: si te reparten una mano positiva sin J, Q, K ni As, pide el cambio siempre (antes de jugar tu primera carta).

## 2. Errores bobos — prohibidos en todos los niveles

Reglas duras para el computador: Fácil, Normal, Difícil y Experto las respetan todas. Lo que cambia entre niveles es la calidad de las demás decisiones, no estas.

| Mano | Error prohibido | Única excepción | Aplica a |
|---|---|---|---|
| Todas las negativas | Ganar una baza que contiene una carta penalizada cuando se podía perder. | Ninguna. | Todos |
| Todas las negativas | Si ya se va a perder la baza seguro (hay una carta más alta en la mesa, o se está fallo), no botar la carta más peligrosa de la mano. | 2 Últimas: guardar a propósito una carta alta para coger la mano más adelante. | Todos |
| Todas las negativas | Jugando de último, no usar la información completa de la baza (p. ej. jugar una carta baja cuando una más alta también perdía). | Ninguna. | Todos |
| No Bazas | Cuando no hay forma de perder la baza, ganarla con una carta baja en vez de la más alta de esa pinta. | Ninguna. | Todos |
| No Corazones | Estando fallo en la pinta jugada, descartar otra carta en lugar del corazón más alto. | Cuando haya una carta de otra pinta claramente más peligrosa para el resto del juego (p. ej. un As sin defensa). | Todos |
| No J's & K's | Liderar una J o una K sin necesidad. | J o K sin defensa: liderarla temprano a propósito, solo si ningún rival está fallo en esa pinta. | Todos |
| No J's & K's | Liderar un As o una Q de una pinta si la J o la K de esa pinta no ha salido y no la tiene uno. | Ninguna. | Todos |
| No Q's | Liderar una Q sin necesidad. | Q sin defensa: liderarla temprano a propósito, solo si ningún rival está fallo en esa pinta. | Todos |
| No Q's | Liderar un As o una K de una pinta si la Q de esa pinta no ha salido y no la tiene uno. | Ninguna. | Todos |
| No K♥ | Jugar la K♥ en una baza de corazones donde no está el As♥, teniendo otro corazón para jugar. | Ninguna. | Todos |
| No K♥ | Estando fallo en la pinta jugada y teniendo la K♥, no descartarla. | Ninguna. | Todos |
| No K♥ | Jugar el As♥ en una baza de corazones cuando la K♥ no ha salido y se tiene un corazón más bajo. | Ninguna. | Todos |
| 2 Últimas | Liderar una carta infinita (la única de su pinta en juego) en la baza 12 o 13. | Cuando todas las demás opciones también ganan la baza. | Todos |
| 2 Últimas | En las bazas 1-11, descartar una carta baja "de defensa" teniendo cartas medias o altas que había que soltar. | Cuando se guarda a propósito una carta alta para coger la mano. | Todos |
| Positivas | Liderar la K (o Q) de triunfo sin que haya salido el As de triunfo. | Destriunfar con 5 o más triunfos fuertes. | Todos |
| Positivas | Cortar con un triunfo alto cuando uno más bajo gana seguro (ningún jugador posterior puede cortar más alto). | Ninguna. | Todos |
| Positivas | Jugar una carta ganadora segura en una baza que ya no se puede ganar. | Cuando Matar Obligatorio obliga a jugarla (solo pasa si nadie ha cortado con triunfo). | Todos |
| Positivas | Si no se puede ganar la baza, botar un ganador seguro en lugar de la carta más inútil. | Ninguna. | Todos |
| Positivas | Liderar una pinta en la que un rival que juega después está fallo y aún tiene triunfos, teniendo alternativas. | Cuando el objetivo es sacarle los triunfos a ese rival. | Todos |
| Subasta | Ofertar 5 o más bazas fuera de una mano excepcional (muchas runfias y triunfo largo y fuerte). | Mano excepcional, según el cálculo. | Todos |
| Subasta | Comprar cuando se quedaría igual o peor que sin comprar (comparando contra que me pongan el triunfo en mi peor pinta). | Ninguna. | Todos |
| Subasta | Siendo dealer, quedarse con el triunfo cuando la oferta más las bazas propias sin triunfo superan lo que se haría poniéndolo uno. | Ninguna. | Todos |
| Positivas | Teniendo derecho al cambio de juego (mano sin J, Q, K ni As), no pedirlo. | Ninguna. | Todos |

## 3. Parámetros

Lo que el documento dice en palabras ("cartas bajas", "defensa"...) traducido a números para el computador. Los valores de bazas son iniciales; Difícil/Experto los afinan con simulación.

| Concepto | Valor | Origen / estado |
|---|---|---|
| Carta baja | 2 a 6 | Propuesta de Claude — confirmar |
| Carta media ("ombligo") | 7 a 10 | De tu documento (2 Últimas) |
| Carta alta | J, Q, K, As | Propuesta |
| Figura (para Cambio de juego) | J, Q, K, As | Confirmado por Francisco; coincide con el juego |
| Pinta falla | 0 cartas de la pinta | De tu documento |
| Pinta casi falla | 2 cartas o menos | De tu documento |
| Carta con defensa | Al menos 3 cartas más bajas de la misma pinta en la mano | De tu documento (J's & K's, Q's) |
| Carta maestra | La carta más alta que queda en juego de su pinta (puede ser una K si el As ya salió) | Definición |
| Carta infinita | La única carta que queda en juego de su pinta | De tu documento (2 Últimas) |
| Reparto balanceado | 3-3-3-4 | De tu documento |
| Runfia | Pinta de 5 o más cartas | Propuesta |
| Valor As (positivas) | ≈ 1 baza | De tu documento |
| Valor K (positivas) | ≈ 0,75 si está acompañada (2+ cartas en la pinta); ≈ 0,5 si está sola | Coincide con la calibración actual del código |
| Valor Q (positivas) | ≈ 0,25 por defecto; ≈ 0,5-0,75 si mi mano es 3-3-3-4 y la Q está acompañada (3+ cartas) | Integra tu argumento del 3-3-3-4 |
| Cartas largas (positivas) | Desde la 5ª carta de una pinta encabezada por As o K: ≈ 0,5 c/u con triunfo de otra pinta; ≈ 1 c/u en negra o si es la pinta de triunfo | Propuesta — se afina con simulación |
| Oferta grande | 3 bazas; 4 = rara; 5+ = casi nunca | De tu documento |
| Destriunfar | 5 o más triunfos, con al menos 2 de As, K, Q, J | De tu documento (5, 6 o más fuertes) |
| Cálculo exacto del final | Difícil: con 3 cartas o menos por jugador; Experto: con 5 cartas o menos | Propuesta — límite técnico, se ajusta según velocidad |

## 4. Niveles de dificultad

Todos los niveles parten de este documento. Lo que los separa es cuánto recuerdan, cuánto deducen y cuánto analizan.

| Aspecto | Fácil | Normal | Difícil | Experto |
|---|---|---|---|---|
| Errores bobos | Prohibidos | Prohibidos | Prohibidos | Prohibidos |
| Memoria de cartas | Su mano, la baza actual y si ya salieron las cartas penalizadas y sus "protectoras" (lo mínimo para respetar los errores bobos) | Lo de Fácil + Ases, K's y Q's por pinta, cuántas veces ha jugado cada pinta y quién está fallo | Todas las cartas que han salido | Todas las cartas y quién puso cada una |
| Deducción sobre los rivales | Ninguna | Solo fallas confirmadas | Fallas + probabilidad de dónde está cada carta | Inferencias de jugador experto (p. ej. un jugador fallo que no botó la K♥ probablemente no la tiene; quien no mató pudiendo no tiene carta alta) |
| Cómo decide la carta | Estrategia general (columna E), escogiendo al azar entre las 2-3 jugadas razonables | Estrategia general + específica (columnas E y F) | Simula jugadas posibles (búsqueda) con tiempo corto, guiada por E y F | Simula jugadas posibles con más tiempo, guiada por E y F |
| Final de la mano | Heurística | Heurística | Cálculo exacto con 3 cartas o menos | Cálculo exacto con 5 cartas o menos |
| Subasta y triunfo | Cuenta Ases y K's | Tabla de valores (hoja Parámetros) | Simula la mano con cada triunfo posible (tiempo corto) | Simula con cada opción posible: cada pinta, negra, hacia abajo y al revés si están activadas (más tiempo) |
| Imperfección deliberada | Sí, entre jugadas razonables (nunca un error bobo) | Ocasionalmente la segunda mejor jugada | No | No |
| Marcador de la partida | No lo considera | No lo considera | No lo considera | Opcional, a futuro: arriesgar más o menos según si va ganando o perdiendo |

## 5. Reglas alternativas

La estrategia de la hoja principal asume las reglas por defecto. Aquí se explica qué cambia con cada regla.

| Regla | Por defecto | Manos donde aplica | Cómo cambia la estrategia |
|---|---|---|---|
| Matar obligatorio | Activada | Positivas | Si se tiene la pinta, hay que jugar una carta que gane la baza si se puede; si no se tiene, hay que cortar con un triunfo que gane si se puede. Si alguien ya cortó con triunfo, los siguientes solo siguen la pinta. Si estás fallo y tus triunfos no superan el triunfo que ya está en la mesa, juegas libre. Consecuencias: no hay opción de agacharse si tienes con qué matar; "ganar con la más baja posible" = la más baja que mata; la regla sirve para forzar a los rivales a sacar sus cartas altas (p. ej. que salga el As antes que tu K). |
| Cambio de juego sin figuras | Activada | Solo positivas | Un jugador al que le reparten una mano positiva sin J, Q, K ni As puede pedir que se reparta de nuevo a todos, mientras no haya jugado su primera carta. El computador siempre debe pedirlo cuando tenga derecho. Con esta regla, el peor juego posible pasa a ser 3-3-3-4 con una sola figura que sea una J. |
| Subasta obligada a vender | Desactivada | Positivas | El dealer que abre la subasta tiene que vender. Su única decisión es abrir o no la subasta: solo debe abrirla si cualquier oferta razonable (≥ 2-3 bazas) más lo que haría sin poner el triunfo le conviene más que poner el triunfo él. |
| Jugar hacia abajo | Desactivada | Positivas | Se arranca con 325 y cada baza resta 75: la mano se vuelve de NO ganar bazas, con triunfo. Aplica la lógica de No Bazas, pero ahora los triunfos son cartas peligrosas (con ellos se gana) y estar fallo de la pinta de triunfo es bueno. Subasta (decisión 7-nov-2026, opción b): la oferta se cobra en puntos, el comprador le paga al dealer oferta × 25 jugando hacia arriba y oferta × 75 jugando hacia abajo. Comprar siempre cuesta, en ambas direcciones. Para el cálculo: comprar hacia abajo solo conviene si nombrar el triunfo me ahorra más de 75 puntos por cada baza ofertada. |
| Al revés | Desactivada | Positivas | El 2 es la carta más alta y el As la más baja. Toda la estrategia aplica igual leyendo "carta alta" como "carta más alta en juego": los valores de la hoja Parámetros se invierten (el 2 vale como el As, el 3 como la K, etc.). |
| Negra (sin triunfo) | Opción al poner el triunfo, no es una regla | Positivas | Nadie corta: las pintas largas encabezadas por As o K se cobran completas y el conteo de cartas es decisivo. Conviene con varios Aces y K's repartidos y alguna pinta larga. Hay que cobrar las cartas maestras cuando se tiene la mano, porque recuperarla es difícil. |

## 6. Pendientes y decisiones

Lo que falta definir y lo que ya se resolvió. Las respuestas se tomaron de Francisco y del código del juego (rama club-rey-visual, 28-ago-2026).

| # | Tema | Pregunta | Estado / respuesta |
|---|---|---|---|
| 1 | Q's — mal juego | "No tener Aces, K's o Q's" como mal juego. | RESUELTO: era un error, se eliminó. |
| 2 | Parámetros | Confirmar los números propuestos en la hoja Parámetros. | Se dejan los propuestos salvo indicación contraria. |
| 3 | Cambio de juego | ¿El As cuenta como figura? ¿Automático o a pedido? ¿En qué manos? | RESUELTO: el As cuenta; el jugador lo pide antes de jugar su primera carta; solo en manos positivas (así está en el juego). |
| 4 | Matar obligatorio | Si alguien ya cortó con triunfo, ¿hay que superar la carta más alta de la pinta? | RESUELTO: no, solo seguir la pinta (así está en el juego). |
| 5 | K♥ | ¿La mano termina cuando alguien se lleva la K♥? | RESUELTO: sí (así está en el juego). |
| 6 | Hacia abajo + subasta | ¿Cómo se cuenta la oferta del comprador cuando se juega hacia abajo? | RESUELTO (opción b): la oferta se cobra en puntos, oferta × 25 hacia arriba y oferta × 75 hacia abajo, del comprador al dealer. Hacia arriba da lo mismo que hoy; hacia abajo corrige el efecto invertido. |
| 7 | Valores por defecto | ¿Subasta obligada, Hacia abajo y Al revés vienen apagadas? | RESUELTO: sí, apagadas (así está en el juego). |
| 8 | Quién escoge la dirección | King Rules.docx dice que el dealer (no el ganador de la subasta) escoge hacia arriba o hacia abajo. El juego hoy deja que lo escoja quien nombra el triunfo (puede ser el comprador). ¿Cuál es la regla? | ABIERTO. Las instrucciones a Claude Code dicen no cambiarlo hasta que lo confirmes. |
