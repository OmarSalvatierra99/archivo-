# Deploy de Lindo Tours

## 1) Instalar dependencias de la app
```bash
cd /home/gabo/portfolio/projects/23-lindoTours
npm install --omit=dev
```

## 2) Preparar variables de entorno
```bash
sudo cp /home/gabo/portfolio/projects/23-lindoTours/desploy/lindo-tours.env.example /etc/default/lindo-tours
sudo nano /etc/default/lindo-tours
```

## 3) Instalar el servicio systemd
```bash
sudo cp /home/gabo/portfolio/projects/23-lindoTours/desploy/lindo-tours.service /etc/systemd/system/lindo-tours.service
sudo systemctl daemon-reload
sudo systemctl enable --now lindo-tours
```

## 4) Instalar el sitio nginx
```bash
sudo cp /home/gabo/portfolio/projects/23-lindoTours/desploy/lindotours.omar-xyz.shop.nginx /etc/nginx/sites-available/lindotours.omar-xyz.shop.conf
sudo ln -s /etc/nginx/sites-available/lindotours.omar-xyz.shop.conf /etc/nginx/sites-enabled/lindotours.omar-xyz.shop
sudo nginx -t
sudo systemctl reload nginx
```

## 5) Validar el servicio
```bash
curl -I http://127.0.0.1:5023
sudo systemctl status lindo-tours --no-pager -l
sudo journalctl -u lindo-tours -n 100 --no-pager
```

## Notas
- El servicio escucha por defecto en `127.0.0.1:5023`.
- La base SQLite y los archivos privados quedan fuera del repo en `/var/lib/lindo-tours/`.
- Las imagenes de tours subidas desde admin siguen guardandose en `public/imagenes/servicios/` dentro del proyecto.
- El backend ya queda listo para trabajar detras de `nginx` usando `X-Forwarded-Proto`.
- El ejemplo de `nginx` asume un certificado existente en `/etc/letsencrypt/live/omar-xyz.shop/`. Si usas uno dedicado para `lindotours.omar-xyz.shop`, cambia esas rutas.
- Antes de probar el dominio, asegura el registro DNS `A` o `CNAME` para `lindotours.omar-xyz.shop`.
