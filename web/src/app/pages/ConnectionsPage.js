import React from 'react';
import { Container, Grid, makeStyles } from '@mui/material';
import { useIsExtensionWidth } from '../utils/utils';
import ConnectionsList from '../components/ConnectionsList';

const useStyles = makeStyles((theme) => ({
  container: {
    [theme.breakpoints.down(theme.ext)]: {
      padding: 0,
    },
    [theme.breakpoints.up(theme.ext)]: {
      maxWidth: 'md',
    },
  },
}));

export default function ConnectionsPage() {
  const classes = useStyles();
  const isExtensionWidth = useIsExtensionWidth();
  return (
    <Container fixed maxWidth="md" className={classes.container}>
      <Grid container spacing={isExtensionWidth ? 0 : 3}>
        <Grid item xs={12}>
          <ConnectionsList />
        </Grid>
      </Grid>
    </Container>
  );
}
