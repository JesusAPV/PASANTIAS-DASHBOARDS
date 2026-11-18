<script setup>
import SectionHeading from '../components/ui/SectionHeading.vue';

const ITEMS = [
  ['Seguidores', 'Número total de usuarios que siguen la cuenta.', 'group'],
  ['Crecimiento', 'Seguidores ganados o perdidos durante el período.', 'trending_up'],
  ['Publicaciones', 'Contenido compartido en formato flat, video o Reel.', 'play_circle'],
  ['Impresiones', 'Número total de veces que el contenido es visto.', 'visibility'],
  ['Alcance', 'Cuentas únicas que vieron el contenido.', 'groups'],
  ['Guardados', 'Veces que los usuarios almacenaron las publicaciones.', 'bookmark'],
  ['Visitas al perfil', 'Cantidad de visitas recibidas por la cuenta.', 'person'],
  ['Engagement', 'Interacciones divididas entre seguidores y multiplicadas por 100.', 'favorite'],
  ['Me gusta', 'Total de likes recibidos.', 'thumb_up'],
  ['Comentarios', 'Respuestas realizadas sobre publicaciones.', 'chat_bubble'],
  ['Compartidos', 'Veces que el contenido fue enviado a otros usuarios.', 'send'],
  ['Stickers de interacción', 'Herramientas interactivas utilizadas en historias o Reels.', 'repeat'],
];
</script>

<template>
  <SectionHeading title="Guía básica para entender Instagram Analytics" subtitle="Glosario fijo para acompañar al cliente dentro del mismo dashboard." source="Contenido estático" />
  <div class="glossary">
    <div v-for="[t, c, icon] in ITEMS" :key="t" class="gloss">
      <div class="ico"><q-icon :name="icon" /></div>
      <div><b>{{ t }}</b><p>{{ c }}</p></div>
    </div>
  </div>
</template>
