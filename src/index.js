import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import {  MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';


/**
 * RQ:
 * By wrapping your <App /> component with <MantineProvider>, you are making the Mantine theme and styling context
 *  available to all Mantine components within your application tree
RQ:
@mantine/core/styles.css: This file contains the pre-compiled CSS rules that define the visual appearance 
of Mantine's core components. You must import this globally to get the default styling.

@emotion/react and @emotion/styled: These are the styling engine that Mantine uses under the hood. 
They allow Mantine's components to be styled using CSS-in-JS. You install them as peer dependencies so
 that Mantine can use them, but you don't directly import CSS files from these packages in your
  application code to get the base Mantine styles. 
  *
   * RQ:
   * theme={{ colorScheme: 'dark' }} didnt give desired result coz:
   * 
   * Mantine uses a combination of theme and defaultColorScheme to determine the active color scheme. 
   * Without defaultColorScheme, your app might have defaulted to 'light' or followed the system’s 
   * preference (e.g., if your OS is in light mode). Adding defaultColorScheme="dark" ensures the dark theme
   *  applies immediately, regardless of other factors.
  
*/
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
//defaultColorScheme="dark"
  <React.StrictMode>
        <MantineProvider>
          <App/>
               </MantineProvider>
                          </React.StrictMode>
);

reportWebVitals();
