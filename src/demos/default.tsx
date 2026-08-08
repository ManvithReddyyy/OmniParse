'use client';

import { UploadCard } from '@/components/ui/upload-ui';
import React from 'react';

const DefaultDemo: React.FC = () => {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
      <UploadCard
        status="uploading"
        progress={68}
        title="Just a minute..."
        description="Your file is uploading right now. Just give us a second to finish your upload."
        primaryButtonText="Cancel"
        onPrimaryButtonClick={() => console.log('Cancel upload')}
      />
      <UploadCard
        status="success"
        title="Your file was uploaded!"
        description="Your file was succesfully uploaded. You can copy the link to your clipboard."
        primaryButtonText="Copy Link"
        onPrimaryButtonClick={() => console.log('Copy Link')}
        secondaryButtonText="Done"
        onSecondaryButtonClick={() => console.log('Done')}
      />
      <UploadCard
        status="error"
        title="We are so sorry!"
        description="There was and error and your file could not be uploaded. Would you like to try again?"
        primaryButtonText="Retry"
        onPrimaryButtonClick={() => console.log('Retry upload')}
        secondaryButtonText="Cancel"
        onSecondaryButtonClick={() => console.log('Cancel error')}
      />
    </section>
  );
};

export default DefaultDemo;
