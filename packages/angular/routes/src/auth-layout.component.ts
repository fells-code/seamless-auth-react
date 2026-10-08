/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import {
  ChangeDetectionStrategy,
  Component,
  input,
  ViewEncapsulation,
} from '@angular/core';

/**
 * The frame every bundled screen renders in. It carries the screens' one
 * stylesheet, unencapsulated so an application can theme the `.sa-*` classes
 * and `--seamless-*` properties like any other global style.
 */
@Component({
  selector: 'sa-auth-layout',
  // One projection slot only: content goes to a single <ng-content>, so a
  // second one in another branch would leave a screen empty.
  template: `<div [class]="card() ? 'sa-card' : 'sa-center'"><ng-content /></div>`,
  styleUrl: './seamless-auth.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'sa-auth' },
})
export class SaAuthLayout {
  readonly card = input(true);
}
