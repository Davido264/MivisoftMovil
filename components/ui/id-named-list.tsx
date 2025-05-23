import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { FlashList } from "@shopify/flash-list";
import React, {
  createContext,
  FC,
  memo,
  PropsWithChildren,
  useContext,
  useDeferredValue,
  useEffect,
  useState,
} from "react";
import { View } from "react-native";
import { createStore, StoreApi, useStore } from "zustand";
import assert from "@/lib/assert";
import ErrorScreen from "./error-screen";

type IdNamedObject = { id: number; name: string } & object;

type StoreType<T extends IdNamedObject> = {
  data: T[];
  term: string;
  customFilterFunction?: (item: T) => boolean;
};

type IdNamedListContextType<T extends IdNamedObject> = {
  data: StoreApi<StoreType<T>>;
  setTerm: (term: string) => void;
  setCustomFilterFunction: (fn: (item: T) => boolean) => void;
};

const IdNamedListContext = createContext<IdNamedListContextType<any> | null>(
  null,
);

type IdNamedListProps<T extends IdNamedObject> = {
  data: T[];
  error?: string;
} & PropsWithChildren;

export function IdNamedList<T extends IdNamedObject>({
  data,
  error,
  children,
}: IdNamedListProps<T>) {
  const store = createStore<StoreType<T>>(() => ({
    data: data ?? [],
    term: "",
    customFilterFunction: undefined,
  }));
  const setTerm = (term: string) => {
    store.setState({ term });
  };
  const setCustomFilterFunction = (fn: (item: T) => boolean) => {
    store.setState({ customFilterFunction: fn });
  };

  if (error) {
    return <ErrorScreen msg={error} />;
  }

  return (
    <IdNamedListContext.Provider
      value={{ data: store, setTerm, setCustomFilterFunction }}
    >
      {children}
    </IdNamedListContext.Provider>
  );
}

IdNamedList.SearchField = SearchField;
IdNamedList.ElementList = ElementList;
IdNamedList.CustomFilters = CustomFilters;

type ElementListProps<T extends IdNamedObject> = {
  ElementItem?: FC<T>;
  estimatedItemSize?: number;
  contentContainerClassName?: string;
  bottomSafe?: boolean;
};

function DefaultListItem({ id, name }: IdNamedObject) {
  return (
    <View className="w-full my-2 items-start">
      <Text className="text-lg flex-shrink text-wrap">{name}</Text>
    </View>
  );
}
const DefaltListItemMemo = memo(DefaultListItem);

function ElementList<T extends IdNamedObject>({
  ElementItem,
  estimatedItemSize,
  contentContainerClassName,
  bottomSafe = false,
}: ElementListProps<T>) {
  const context = useContext(IdNamedListContext);
  assert.notNull(context);

  const data = useStore(context.data, (state) => state.data);
  const term = useStore(context.data, (state) => state.term);
  const customFilterFunction = useStore(
    context.data,
    (state) => state.customFilterFunction,
  );

  const filterfn = (i: T) => {
    return (
      i.name.toLowerCase().includes(term.toLowerCase()) &&
      (customFilterFunction ? customFilterFunction(i) : true)
    );
  };

  const filteredData = data.filter(filterfn);

  const Footer = bottomSafe ? <View className="pb-safe-offset-10" /> : null;

  return (
    <FlashList
      data={filteredData}
      estimatedItemSize={ElementItem ? estimatedItemSize : undefined}
      keyExtractor={(i) => `${i.id}`}
      contentContainerClassName={contentContainerClassName}
      ListFooterComponent={Footer}
      renderItem={({ item }) => {
        return ElementItem !== undefined ? (
          <ElementItem {...(item as T)} />
        ) : (
          <DefaltListItemMemo {...item} />
        );
      }}
    />
  );
}

function SearchField({ placeholder = "Buscar..." }: { placeholder?: string }) {
  const context = useContext(IdNamedListContext);
  assert.notNull(context);
  const [term, setTerm] = useState("");

  const query = useDeferredValue(term);

  useEffect(() => {
    context.setTerm(query);
  }, [query, context]);

  return (
    <View className="p-4">
      <Input onChangeText={setTerm} placeholder={placeholder} />
    </View>
  );
}

type CustomFiltersProps<T extends IdNamedObject> = {
  children: FC<{ setFilter: (fn: (item: T) => boolean) => void }>;
};

function CustomFilters<T extends IdNamedObject>({
  children,
}: CustomFiltersProps<T>) {
  const context = useContext(IdNamedListContext);
  assert.notNull(context);

  return <>{children({ setFilter: context.setCustomFilterFunction })}</>;
}
