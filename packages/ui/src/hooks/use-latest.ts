"use client"

import * as React from "react"

/**
 * Conserve la derniere version d'une valeur/callback dans une ref stable.
 *
 * A utiliser dans les effets qui ne doivent PAS se re-abonner quand un
 * callback parent change d'identite (AudioPlayer, MathRenderer,
 * use-file-upload). Inclure directement le callback dans les deps d'un effet
 * qui pose des listeners ou restaure une position de lecture provoquerait des
 * re-executions a chaque rendu du parent — au mieux du travail inutile, au
 * pire une position de lecture remise a zero en pleine lecture.
 *
 * La ref est ecrite dans un effet (jamais pendant le rendu) : un evenement qui
 * survient entre le rendu et le commit peut donc invoquer la version
 * precedente, ce qui est sans consequence pour des callbacks de notification.
 */
export function useLatest<T>(value: T): React.RefObject<T> {
  const ref = React.useRef(value)
  React.useEffect(() => {
    ref.current = value
  }, [value])
  return ref
}
