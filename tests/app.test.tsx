import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

afterEach(cleanup);
import { App } from '../src/app/App';
import { MemoryRepository } from '../src/engine/storage';

describe('navigation', () => {
  it('goes home → kid → games → back', () => {
    const repo = new MemoryRepository();
    render(<App repo={repo} />);
    fireEvent.click(screen.getByTestId('kid-kid1'));
    expect(screen.getByTestId('menu-screen')).toBeTruthy();
    expect(screen.getAllByTestId(/^tile-/)).toHaveLength(13);
    fireEvent.click(screen.getByTestId('stickers'));
    expect(screen.getByTestId('sticker-screen')).toBeTruthy();
    fireEvent.click(screen.getByTestId('back'));
    fireEvent.click(screen.getByTestId('back'));
    expect(screen.getByTestId('home-screen')).toBeTruthy();
  });

  it('language switch is saved', () => {
    const repo = new MemoryRepository();
    render(<App repo={repo} />);
    act(() => {
      fireEvent.click(screen.getByTestId('lang-es'));
    });
    expect(repo.load().settings.lang).toBe('es');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Pequeños Pensadores');
  });

  it('a quick tap does not open the grown-up area', () => {
    render(<App repo={new MemoryRepository()} />);
    fireEvent.click(screen.getByTestId('parent-entry'));
    expect(screen.getByTestId('parent-gate')).toBeTruthy();
    fireEvent.pointerDown(screen.getByTestId('gate-hold'));
    fireEvent.pointerUp(screen.getByTestId('gate-hold'));
    expect(screen.queryByTestId('gate-word')).toBeNull();
    expect(screen.queryByTestId('parent-screen')).toBeNull();
  });
});
