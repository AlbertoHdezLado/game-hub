import { useEffect, useState } from 'react';
import type { GameDefinition } from '@/types/game';

interface InfoDialogProps {
  game: GameDefinition | null;
  onClose: () => void;
}

interface WerewolfRole {
  nombre: string;
  equipo: string;
  imagen: string;
  descripcion: string;
}

const werewolfTeamLabels: Record<string, string> = {
  lobos: 'Lobos',
  aldeanos: 'Aldeanos',
  solitario: 'Solitario',
};

const orderedGuideSections = new Set([
  'usar la app',
  'cómo jugar',
  'cómo jugar la ronda',
  'cómo se juega una ronda',
]);

export function InfoDialog({ game, onClose }: Readonly<InfoDialogProps>) {
  const [guideHtml, setGuideHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!game) return;

    let cancelled = false;
    setGuideHtml(null);

    fetch(`/games/${game.slug}/`)
      .then((response) => {
        if (!response.ok) throw new Error('No se pudo cargar la guía');
        return response.text();
      })
      .then((html) => {
        if (cancelled) return;

        const guideDocument = new DOMParser().parseFromString(html, 'text/html');
        const guide = guideDocument.querySelector('#guide-modal-backdrop .guide-modal');
        guide?.querySelector('.guide-modal-close')?.remove();

        guide?.querySelectorAll('li').forEach((item) => {
          if (item.textContent?.trim().toLocaleLowerCase().startsWith('no hace falta')) {
            item.remove();
          }
        });

        guide?.querySelectorAll('ul, ol').forEach((list) => {
          if (!list.children.length) list.remove();
        });

        guide?.querySelectorAll('h3').forEach((heading) => {
          const sectionTitle = heading.textContent?.trim().toLocaleLowerCase() ?? '';
          const list = heading.nextElementSibling;
          if (list?.tagName !== 'UL' && list?.tagName !== 'OL') return;

          const shouldBeOrdered = orderedGuideSections.has(sectionTitle);
          if (shouldBeOrdered && list.tagName === 'OL') return;
          if (!shouldBeOrdered && list.tagName === 'UL') return;

          const normalizedList = guideDocument.createElement(shouldBeOrdered ? 'ol' : 'ul');
          normalizedList.replaceChildren(...Array.from(list.childNodes));
          list.replaceWith(normalizedList);
        });

        if (game.slug === 'werewolf') {
          fetch('/data/werewolf-roles.json')
            .then((response) => {
              if (!response.ok) throw new Error('No se pudieron cargar los roles');
              return response.json() as Promise<{ roles?: WerewolfRole[] }>;
            })
            .then((data) => {
              if (cancelled) return;
              const catalog = guide?.querySelector('#guide-roles-catalog');
              if (catalog && data.roles) {
                catalog.replaceChildren(...data.roles.map((role) => {
                  const row = guideDocument.createElement('details');
                  row.className = 'role-row';

                  const summary = guideDocument.createElement('summary');
                  summary.className = 'role-summary';

                  const image = guideDocument.createElement('img');
                  image.className = 'role-thumb';
                  image.src = `/${role.imagen}`;
                  image.alt = '';
                  image.loading = 'lazy';

                  const info = guideDocument.createElement('div');
                  info.className = 'role-info';

                  const name = guideDocument.createElement('div');
                  name.className = 'role-name';
                  name.textContent = role.nombre;

                  const team = guideDocument.createElement('div');
                  team.className = 'role-team-tag';
                  team.textContent = werewolfTeamLabels[role.equipo] ?? role.equipo;

                  const description = guideDocument.createElement('div');
                  description.className = 'guide-role-desc';
                  description.textContent = role.descripcion;

                  info.append(name, team);
                  summary.append(image, info);
                  row.append(summary, description);
                  return row;
                }));
              }
              setGuideHtml(guide?.innerHTML ?? null);
            })
            .catch(() => {
              if (!cancelled) setGuideHtml(guide?.innerHTML ?? null);
            });
          return;
        }

        setGuideHtml(guide?.innerHTML ?? null);
      })
      .catch(() => {
        if (!cancelled) setGuideHtml(null);
      });

    return () => { cancelled = true; };
  }, [game]);

  if (!game) return null;
  const iconUrl = `/resources/images/hub/${game.icon}`;
  return (
    <div className="desc-overlay-backdrop">
      <button type="button" className="desc-overlay-close" aria-label="Cerrar" onClick={onClose}>✕</button>
      <dialog className="desc-overlay" aria-labelledby="game-info-title" open>
        <span className="desc-overlay-icon" style={{ maskImage: `url('${iconUrl}')`, WebkitMaskImage: `url('${iconUrl}')`, backgroundColor: `var(--theme-${game.theme})` }} />
        <div className="desc-overlay-title" id="game-info-title">{game.title}</div>
        <p className="desc-overlay-text">{game.description}</p>
        <div className="desc-overlay-content">
          {guideHtml ? <div dangerouslySetInnerHTML={{ __html: guideHtml }} /> : <p>Cargando instrucciones...</p>}
        </div>
      </dialog>
    </div>
  );
}
