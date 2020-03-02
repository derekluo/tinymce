/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */

import {
  AlloyComponent, AlloySpec, AlloyTriggers, Behaviour, Disabling, Focusing, FormField as AlloyFormField, Representing, SimpleSpec, SketchSpec,
  Tabstopping
} from '@ephox/alloy';
import { Dialog, Menu as BridgeMenu } from '@ephox/bridge';
import { Arr, Cell, Fun, Obj, Optional, Optionals } from '@ephox/katamari';
import { UiFactoryBackstage } from '../../backstage/Backstage';
import { renderLabel } from '../alien/FieldLabeller';
import { renderCommonDropdown, updateMenuText } from '../dropdown/CommonDropdown';
import { formChangeEvent } from '../general/FormEvents';
import ItemResponse from '../menus/item/ItemResponse';
import * as NestedMenus from '../menus/menu/NestedMenus';

type ListBoxSpec = Omit<Dialog.ListBox, 'type'>;

const isSingleListItem = (item: Dialog.ListBoxItemSpec): item is Dialog.ListBoxSingleItemSpec => !Obj.has(item as Record<string, any>, 'items');

const fetchItems = (dropdownComp: AlloyComponent, name: string, items: Dialog.ListBoxItemSpec[]): Array<BridgeMenu.MenuItemSpec | BridgeMenu.NestedMenuItemSpec> =>
  Arr.map(items, (item) => {
    if (!isSingleListItem(item)) {
      return {
        type: 'nestedmenuitem',
        text: item.text,
        getSubmenuItems: () => fetchItems(dropdownComp, name, item.items)
      };
    } else {
      return {
        type: 'menuitem',
        text: item.text,
        value: item.value,
        onAction: () => {
          Representing.setValue(dropdownComp, item.value);
          AlloyTriggers.emitWith(dropdownComp, formChangeEvent, { name } );
          Focusing.focus(dropdownComp);
        }
      };
    }
  });

const findItemByValue = (items: Dialog.ListBoxItemSpec[], value: string) =>
  Arr.findMap(items, (item) => {
    if (!isSingleListItem(item)) {
      return findItemByValue(item.items, value);
    } else {
      return Optionals.someIf(item.value === value, item);
    }
  });

export const renderListBox = (spec: ListBoxSpec, backstage: UiFactoryBackstage): SketchSpec => {
  const providersBackstage = backstage.shared.providers;
  const initialItem = Arr.head(spec.items).filter(isSingleListItem);
  const selectedValue = Cell(initialItem.map((item) => item.value).getOr(''));

  const pLabel = spec.label.map((label) => renderLabel(label, providersBackstage));

  const pField = AlloyFormField.parts.field({
    dom: { },
    factory: {
      sketch: (sketchSpec) => renderCommonDropdown({
        uid: sketchSpec.uid,
        text: initialItem.map((item) => item.text),
        icon: Optional.none(),
        tooltip: spec.label,
        role: Optional.none(),
        fetch: (comp, callback) => {
          const items = fetchItems(comp, spec.name, spec.items);
          callback(
            NestedMenus.build(items, ItemResponse.CLOSE_ON_EXECUTE, backstage, false)
          );
        },
        onSetup: Fun.constant(Fun.noop),
        getApi: Fun.constant({ }),
        columns: 1,
        presets: 'normal',
        classes: [],
        dropdownBehaviours: [
          Tabstopping.config({}),
          Representing.config({
            store: {
              // Need to use "manual" here as we only want to update the saved
              // value if the value set is a valid property
              mode: 'manual',
              getValue: selectedValue.get,
              setValue: (comp, data) => {
                findItemByValue(spec.items, data)
                  .each((item) => {
                    selectedValue.set(item.value);
                    AlloyTriggers.emitWith(comp, updateMenuText, { text: item.text });
                  });
              }
            }
          })
        ]
      },
      'tox-listbox',
      backstage.shared)
    }
  });

  const listBoxWrap: SimpleSpec = {
    dom: {
      tag: 'div',
      classes: [ 'tox-listboxfield' ]
    },
    components: [ pField ]
  };

  return AlloyFormField.sketch({
    dom: {
      tag: 'div',
      classes: [ 'tox-form__group' ]
    },
    components: Arr.flatten<AlloySpec>([ pLabel.toArray(), [ listBoxWrap ]]),
    fieldBehaviours: Behaviour.derive([
      Disabling.config({
        disabled: Fun.constant(spec.disabled),
        onDisabled: (comp) => {
          AlloyFormField.getField(comp).each(Disabling.disable);
        },
        onEnabled: (comp) => {
          AlloyFormField.getField(comp).each(Disabling.enable);
        }
      })
    ])
  });
};
