import Link from "next/link";
import styles from "./Shell.module.css";
import { useShell } from "./useShell";

type ShellProps = {
  children: React.ReactNode;
};

/**
 * Shell público de Greener: menú lateral de iconos siempre visible (brief §6)
 * + área de contenido. Vive en app/(public)/layout.tsx para no remontarse
 * al navegar entre home, casos, tools e insights (arquitectura §24.3).
 *
 * El contenido visual es deliberadamente mínimo mientras el diseño final
 * no está cerrado (arquitectura §24.1): solo fija la disposición base.
 */
export function Shell({ children }: ShellProps) {
  const { navItems } = useShell();

  return (
    <div className={styles.shell}>
      <nav className={styles.sidebar} aria-label="Navegación principal">
        <ul>
          {navItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href} aria-label={item.label} title={item.label}>
                {item.label[0]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
