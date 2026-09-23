SHAKHA // LEVEL 26

Запуск:
1. Открой index.html в браузере.
2. Для полноценной работы через localhost можно запустить в этой папке:
   python -m http.server 8080
   затем открыть http://localhost:8080

Музыка:
- Положи MP3-файл сюда: assets/music.mp3
- Кнопка MUSIC OFF / MUSIC ON уже подключена.

Фото:
- Сейчас в PLAYER PROFILE стоит стилизованный PHOTO PLACEHOLDER.
- Можно заменить блок .avatar-placeholder в index.html на <img> или фон.

Видео:
- Уже подключено: assets/shaxa_animation.mp4
- На desktop курсор по горизонтали управляет текущим кадром 5-секундной анимации,
  а сцена слегка наклоняется вслед за мышкой.
- На mobile видео работает как loop.

Зависимости:
- GSAP и ScrollTrigger загружаются через CDN.
- Google Fonts загружаются через интернет.
- Без интернета контент останется доступен, но CDN-анимации и web-шрифты могут не загрузиться.
