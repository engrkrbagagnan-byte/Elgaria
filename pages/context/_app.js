import { CartProvider } from './cartcontext';
// ... other imports

function MyApp({ Component, pageProps }) {
  return (
    <CartProvider>
      <Component {...pageProps} />
    </CartProvider>
  );
}
export default MyApp;